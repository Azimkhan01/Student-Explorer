import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";

import { createHash, randomUUID } from "crypto";
import { Server, Socket } from "socket.io";
import { RedisService } from "../utils/redis/redis.service.js";

const AVATARS = [
  "🦊", "🐼", "🦁", "🐯", "🐸", "🐵", "🦄", "🐙",
  "🐧", "🦉", "🐳", "🦋", "🚀", "⭐", "🔥", "🎮",
];

const TEACHER_REACTIONS = ["👏", "🔥", "🎉", "😮", "💡", "❤️", "😂", "🚀"];
const MAX_TEACHER_MESSAGE_LENGTH = 140;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROOM_TTL_SECONDS = 6 * 60 * 60; // safety net
const FINISHED_GRACE_MS = 10 * 60 * 1000; // keep results after the quiz ends
const TEACHER_GRACE_MS = 60 * 1000; // teacher may reconnect within this time

interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_answer: string | number;
  marks: number;
}

interface Student {
  id: string; // STABLE id (hash of roomId + email). Survives reconnects.
  socketId: string; // CURRENT socket (empty string while offline)
  email: string;
  username: string;
  avatar: string;
  score: number;
  totalTimeMs: number;
  answeredQuestions: number;
  connected: boolean;
}

interface RoomMeta {
  roomId: string;
  code: number;
  teacherSocketId: string;
  teacherToken: string;
  teacherId: string;
  quickzyId: string;
}

interface TestState {
  status: "waiting" | "running" | "question-ended" | "finished";
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  durationSeconds: number;
}

interface QuizData {
  questions: Question[];
}

interface QuestionResult {
  id: string;
  username: string;
  avatar: string;
  status: "correct" | "wrong" | "unanswered";
  selectedOptionIndex: number | null;
  responseTimeMs: number | null;
  earnedMarks: number;
}

interface LastResult {
  questionIndex: number;
  correctOptionIndex: number;
  results: QuestionResult[];
  distribution: number[];
}

@WebSocketGateway({
  path: "/socket.io",
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.CLIENT_URL ?? "")
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed"), false);
      }
    },
    credentials: true,
  },
})
export class CreateSocket
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private questionTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private teacherTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private lastBroadcastAt = new Map<string, number>();

  constructor(private readonly redisService: RedisService) {}

  // -----------------------------------------
  // KEYS
  // -----------------------------------------

  private roomMetaKey(roomId: string) {
    return `quickzy-room:${roomId}:meta`;
  }
  private roomUsersKey(roomId: string) {
    return `quickzy-room:${roomId}:users`;
  }
  private roomCodeKey(code: number) {
    return `quickzy-${code}`;
  }
  private quizKey(roomId: string) {
    return `quickzy-room:${roomId}:quiz`;
  }
  private testStateKey(roomId: string) {
    return `quickzy-room:${roomId}:test-state`;
  }
  private answersKey(roomId: string, questionIndex: number) {
    return `quickzy-room:${roomId}:answers:${questionIndex}`;
  }
  private bannedKey(roomId: string) {
    return `quickzy-room:${roomId}:banned`;
  }
  private lastResultKey(roomId: string) {
    return `quickzy-room:${roomId}:last-result`;
  }
  private finishLockKey(roomId: string, questionIndex: number) {
    return `quickzy-room:${roomId}:lock:${questionIndex}`;
  }
  private roomPattern(roomId: string) {
    const safe = roomId.replace(/[\\*?[\]]/g, "\\$&");
    return `quickzy-room:${safe}:*`;
  }

  // -----------------------------------------
  // HELPERS
  // -----------------------------------------

  private makeStudentId(roomId: string, email: string) {
    return createHash("sha256")
      .update(`${roomId}:${email}`)
      .digest("hex")
      .slice(0, 16);
  }

  private async touchRoom(roomId: string, code: number) {
    const keys = [
      this.roomMetaKey(roomId),
      this.roomUsersKey(roomId),
      this.quizKey(roomId),
      this.testStateKey(roomId),
      this.bannedKey(roomId),
      this.lastResultKey(roomId),
      this.roomCodeKey(code),
    ];

    await Promise.all(
      keys.map((k) => this.redisService.expire(k, ROOM_TTL_SECONDS)),
    );
  }

  private async destroyRoom(roomId: string, knownCode?: number) {
    for (const map of [
      this.questionTimers,
      this.cleanupTimers,
      this.teacherTimers,
    ]) {
      const t = map.get(roomId);
      if (t) clearTimeout(t);
      map.delete(roomId);
    }

    try {
      let code = knownCode;

      if (code === undefined) {
        const meta = await this.redisService.getObject<RoomMeta>(
          this.roomMetaKey(roomId),
        );
        code = meta?.code;
      }

      await this.redisService.deleteByPattern(this.roomPattern(roomId));

      if (code !== undefined) {
        await this.redisService.delete(this.roomCodeKey(code));
      }

      console.log("Live quiz room cleaned up:", roomId);
    } catch (error) {
      console.error("Destroy room error:", error);
    }
  }

  private isRateLimited(key: string, minGapMs: number) {
    const now = Date.now();
    const last = this.lastBroadcastAt.get(key) ?? 0;
    if (now - last < minGapMs) return true;
    this.lastBroadcastAt.set(key, now);
    return false;
  }

  private makeEventId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private toSafeQuestion(question: Question) {
    return {
      id: question.id,
      question: question.question,
      options: question.options,
      marks: question.marks,
    };
  }

  // -----------------------------------------
  // GATEWAY HOOKS
  // -----------------------------------------

  afterInit(_server: Server) {
    console.log("Live Quiz Socket Gateway Initialized");
  }

  handleConnection(client: Socket) {
    console.log("Client connected:", client.id);
  }

  async handleDisconnect(client: Socket) {
    console.log("Client disconnected:", client.id);

    this.lastBroadcastAt.delete(`${client.id}:reaction`);
    this.lastBroadcastAt.delete(`${client.id}:message`);

    const { role, roomId } = client.data;
    if (!roomId) return;

    if (role === "teacher") {
      await this.onTeacherDisconnected(client, roomId);
      return;
    }

    if (role === "student") {
      await this.onStudentDisconnected(client, roomId);
    }
  }

  // -----------------------------------------
  // CREATE ROOM
  // -----------------------------------------

  @SubscribeMessage("create-room")
  async createRoom(
    @MessageBody()
    payload: {
      code: number;
      quickzyId: string;
      teacher_id: string | number;
      questions: Question[];
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (
        !payload ||
        !Number.isInteger(payload.code) ||
        !payload.quickzyId ||
        !payload.teacher_id ||
        !Array.isArray(payload.questions) ||
        payload.questions.length === 0
      ) {
        client.emit("room-error", {
          message: "Invalid room information or no questions found.",
        });
        return;
      }

      const codeKey = this.roomCodeKey(payload.code);

      const teacherId = String(payload.teacher_id);
      const roomId = `${payload.code}-${payload.quickzyId}-${teacherId}`;
      const teacherToken = randomUUID();

      const meta: RoomMeta = {
        roomId,
        code: payload.code,
        teacherSocketId: client.id,
        teacherToken,
        teacherId,
        quickzyId: payload.quickzyId,
      };

      const initialState: TestState = {
        status: "waiting",
        currentQuestionIndex: -1,
        questionStartedAt: null,
        questionEndsAt: null,
        durationSeconds: 20,
      };

      const claimed = await this.redisService.setNx(
        codeKey,
        roomId,
        ROOM_TTL_SECONDS,
      );

      if (!claimed) {
        client.emit("room-error", {
          message: "Room code already exists. Please try again.",
        });
        return;
      }

      await client.join(roomId);

      client.data.role = "teacher";
      client.data.roomId = roomId;

      await this.redisService.setObject(
        this.roomMetaKey(roomId),
        meta,
        ROOM_TTL_SECONDS,
      );
      await this.redisService.setObject(
        this.quizKey(roomId),
        { questions: payload.questions },
        ROOM_TTL_SECONDS,
      );
      await this.redisService.setObject(
        this.testStateKey(roomId),
        initialState,
        ROOM_TTL_SECONDS,
      );

      client.emit("room-created", {
        roomId,
        code: payload.code,
        teacherToken,
        message: "Room created successfully.",
      });

      client.emit("room-users", []);

      console.log("Live quiz room created:", roomId);
    } catch (error) {
      console.error("Create room error:", error);
      client.emit("room-error", {
        message: "Unable to create the live quiz room.",
      });
    }
  }

  // -----------------------------------------
  // TEACHER RESUMES AFTER REFRESH / LOST CONNECTION
  // -----------------------------------------

  @SubscribeMessage("resume-room")
  async resumeRoom(
    @MessageBody() payload: { roomId?: string; teacherToken?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const roomId = typeof payload?.roomId === "string" ? payload.roomId : "";
      const token =
        typeof payload?.teacherToken === "string" ? payload.teacherToken : "";

      const meta = roomId
        ? await this.redisService.getObject<RoomMeta>(this.roomMetaKey(roomId))
        : null;

      if (!meta || !token || meta.teacherToken !== token) {
        client.emit("room-error", {
          code: "ROOM_GONE",
          message: "This room no longer exists.",
        });
        return;
      }

      const pending = this.teacherTimers.get(roomId);
      if (pending) clearTimeout(pending);
      this.teacherTimers.delete(roomId);

      meta.teacherSocketId = client.id;
      await this.redisService.setObject(
        this.roomMetaKey(roomId),
        meta,
        ROOM_TTL_SECONDS,
      );

      await client.join(roomId);
      client.data.role = "teacher";
      client.data.roomId = roomId;

      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );
      const quiz = await this.redisService.getObject<QuizData>(
        this.quizKey(roomId),
      );

      if (!state || !quiz) {
        client.emit("room-error", {
          code: "ROOM_GONE",
          message: "This room no longer exists.",
        });
        return;
      }

      await this.replayState(client, roomId, state, quiz);

      const students = await this.getRoomStudents(roomId);
      const leaderboard = await this.getLeaderboard(roomId);

      let answeredIds: string[] = [];
      if (state.currentQuestionIndex >= 0) {
        const answers = await this.redisService.hGetAll(
          this.answersKey(roomId, state.currentQuestionIndex),
        );
        answeredIds = Object.keys(answers);
      }

      client.emit("room-resumed", {
        roomId,
        code: meta.code,
        status: state.status,
        durationSeconds: state.durationSeconds,
        students,
        leaderboard,
        answeredIds,
        answeredCount: answeredIds.length,
      });

      console.log("Teacher resumed room:", roomId);
    } catch (error) {
      console.error("Resume room error:", error);
      client.emit("room-error", { message: "Unable to resume the room." });
    }
  }

  // -----------------------------------------
  // JOIN ROOM (new student OR reconnecting student)
  // -----------------------------------------

  @SubscribeMessage("join-room")
  async joinRoom(
    @MessageBody()
    payload: {
      code: number;
      email: string;
      username: string;
      avatar?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!payload || !Number.isInteger(payload.code)) {
        client.emit("room-error", {
          message: "Please provide a valid room code.",
        });
        return;
      }

      const username = String(payload.username ?? "").trim().slice(0, 24);
      const email = String(payload.email ?? "")
        .trim()
        .toLowerCase()
        .slice(0, 254);

      if (username.length < 2 || !EMAIL_RE.test(email)) {
        client.emit("room-error", {
          message: "Please enter a valid name and email address.",
        });
        return;
      }

      const roomId = await this.redisService.get(
        this.roomCodeKey(payload.code),
      );

      if (!roomId) {
        client.emit("room-error", {
          code: "ROOM_GONE",
          message: "Invalid room code. Room does not exist.",
        });
        return;
      }

      const meta = await this.redisService.getObject<RoomMeta>(
        this.roomMetaKey(roomId),
      );

      if (!meta) {
        client.emit("room-error", {
          code: "ROOM_GONE",
          message: "Room information is missing.",
        });
        return;
      }

      const isBanned = await this.redisService.hExists(
        this.bannedKey(roomId),
        email,
      );

      if (isBanned) {
        client.emit("room-error", {
          code: "BANNED",
          message: "The teacher removed you from this quiz.",
        });
        return;
      }

      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );
      const quiz = await this.redisService.getObject<QuizData>(
        this.quizKey(roomId),
      );

      if (!state || !quiz) {
        client.emit("room-error", {
          code: "ROOM_GONE",
          message: "Room information is missing.",
        });
        return;
      }

      const id = this.makeStudentId(roomId, email);
      const rawExisting = await this.redisService.hGet(
        this.roomUsersKey(roomId),
        id,
      );
      const existing = rawExisting ? (JSON.parse(rawExisting) as Student) : null;

      // A finished quiz only accepts people who already took part.
      if (!existing && state.status === "finished") {
        client.emit("room-error", {
          code: "FINISHED",
          message: "This quiz has already finished.",
        });
        return;
      }

      // ---------- RECONNECT: same socket re-emitting join-room ----------
      // Do NOT replace the record, do NOT notify teacher. Just re-sync.
      if (existing && existing.socketId === client.id) {
        await client.join(roomId);
        client.data.role = "student";
        client.data.roomId = roomId;
        client.data.id = id;
        client.data.email = email;
        client.data.username = username;

        client.emit("room-joined", {
          roomId,
          code: payload.code,
          id,
          rejoined: true,
          message: "Reconnected to the live quiz.",
        });

        await this.replayState(client, roomId, state, quiz, id);

        const leaderboard = await this.getLeaderboard(roomId);
        client.emit("leaderboard-updated", leaderboard);
        return;
      }

      // ---------- SAME PERSON ON A NEW SOCKET (tab/device) ----------
      if (existing && existing.socketId && existing.socketId !== client.id) {
        const olds = await this.server.in(existing.socketId).fetchSockets();
        for (const old of olds) {
          old.emit("session-replaced", {
            message: "You joined this quiz from another tab or device.",
          });
          old.leave(roomId);
        }
      }

      await client.join(roomId);

      client.data.role = "student";
      client.data.roomId = roomId;
      client.data.id = id;
      client.data.email = email;
      client.data.username = username;

      const avatar = AVATARS.includes(payload.avatar ?? "")
        ? (payload.avatar as string)
        : (existing?.avatar ?? AVATARS[0]);

      // Reconnect keeps score / time / answered count. Only socket changes.
      const student: Student = existing
        ? {
            ...existing,
            socketId: client.id,
            username,
            avatar,
            connected: true,
          }
        : {
            id,
            socketId: client.id,
            email,
            username,
            avatar,
            score: 0,
            totalTimeMs: 0,
            answeredQuestions: 0,
            connected: true,
          };

      await this.redisService.hSet(
        this.roomUsersKey(roomId),
        id,
        JSON.stringify(student),
      );

      await this.touchRoom(roomId, meta.code);

      const students = await this.getRoomStudents(roomId);

      // Notify teacher (new join OR reconnect that needs the list refreshed)
      this.server.to(meta.teacherSocketId).emit("student-joined", student);
      this.server.to(meta.teacherSocketId).emit("room-users", students);

      client.emit("room-joined", {
        roomId,
        code: payload.code,
        id,
        rejoined: !!existing,
        message: existing
          ? "Reconnected to the live quiz."
          : "Successfully joined the live quiz.",
      });

      // Put the (re)connected student back where the quiz currently is.
      await this.replayState(client, roomId, state, quiz, id);

      const leaderboard = await this.getLeaderboard(roomId);
      this.server.to(roomId).emit("leaderboard-updated", leaderboard);

      console.log(
        existing ? "Student reconnected:" : "Student joined:",
        student.username,
      );
    } catch (error) {
      console.error("Join room error:", error);
      client.emit("room-error", {
        message: "Something went wrong while joining the room.",
      });
    }
  }

  // Sends one client whatever it needs to show the current quiz state.
  private async replayState(
    client: Socket,
    roomId: string,
    state: TestState,
    quiz: QuizData,
    studentId?: string,
  ) {
    if (state.status === "running") {
      this.emitQuestionToClient(client, state, quiz.questions);

      if (studentId) {
        const raw = await this.redisService.hGet(
          this.answersKey(roomId, state.currentQuestionIndex),
          studentId,
        );
        if (raw) {
          const a = JSON.parse(raw) as {
            selectedOptionIndex: number;
            responseTimeMs: number;
          };
          client.emit("answer-locked", {
            questionIndex: state.currentQuestionIndex,
            selectedOptionIndex: a.selectedOptionIndex,
            responseTimeMs: a.responseTimeMs,
          });
        }
      }
      return;
    }

    if (state.status === "question-ended") {
      this.emitQuestionToClient(client, state, quiz.questions);

      const last = await this.redisService.getObject<LastResult>(
        this.lastResultKey(roomId),
      );

      if (last) {
        const leaderboard = await this.getLeaderboard(roomId);
        client.emit("question-ended", { ...last, leaderboard });

        const mine = studentId
          ? last.results.find((r) => r.id === studentId)
          : undefined;

        if (mine) {
          client.emit("answer-result", {
            answered: mine.status !== "unanswered",
            isCorrect: mine.status === "correct",
            earnedMarks: mine.earnedMarks,
            selectedOptionIndex: mine.selectedOptionIndex,
            responseTimeMs: mine.responseTimeMs,
          });
        }
      }
      return;
    }

    if (state.status === "finished") {
      const leaderboard = await this.getLeaderboard(roomId);
      client.emit("test-finished", {
        message: "The live test has finished!",
        leaderboard,
      });
    }
  }

  // -----------------------------------------
  // TEACHER STARTS THE TEST
  // -----------------------------------------

  @SubscribeMessage("start-test")
  async startTest(
    @MessageBody() payload: { durationSeconds?: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (client.data.role !== "teacher" || !client.data.roomId) return;

      const roomId = client.data.roomId;

      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );
      const quiz = await this.redisService.getObject<QuizData>(
        this.quizKey(roomId),
      );

      if (!state || !quiz || !quiz.questions.length) {
        client.emit("test-error", { message: "Quiz information is missing." });
        return;
      }

      if (state.status !== "waiting") {
        client.emit("test-error", { message: "The test has already started." });
        return;
      }

      const durationSeconds = Math.min(
        300,
        Math.max(5, Number(payload?.durationSeconds) || 20),
      );

      await this.redisService.setObject(
        this.testStateKey(roomId),
        { ...state, durationSeconds },
        ROOM_TTL_SECONDS,
      );

      await this.startQuestion(roomId, 0);
    } catch (error) {
      console.error("Start test error:", error);
      client.emit("test-error", { message: "Unable to start the test." });
    }
  }

  // -----------------------------------------
  // TEACHER-ONLY: REACTIONS + MESSAGES
  // -----------------------------------------

  @SubscribeMessage("teacher-reaction")
  async teacherReaction(
    @MessageBody() payload: { emoji?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (client.data.role !== "teacher" || !client.data.roomId) return;

      const emoji = String(payload?.emoji ?? "");
      if (!TEACHER_REACTIONS.includes(emoji)) return;

      if (this.isRateLimited(`${client.id}:reaction`, 150)) return;

      this.server.to(client.data.roomId).emit("teacher-reaction", {
        id: this.makeEventId(),
        emoji,
      });
    } catch (error) {
      console.error("Teacher reaction error:", error);
    }
  }

  @SubscribeMessage("teacher-message")
  async teacherMessage(
    @MessageBody() payload: { text?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (client.data.role !== "teacher" || !client.data.roomId) return;

      const text = String(payload?.text ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_TEACHER_MESSAGE_LENGTH);

      if (!text) return;

      if (this.isRateLimited(`${client.id}:message`, 600)) {
        client.emit("test-error", {
          message: "Slow down a little before sending another message.",
        });
        return;
      }

      this.server.to(client.data.roomId).emit("teacher-message", {
        id: this.makeEventId(),
        text,
        sentAt: Date.now(),
      });
    } catch (error) {
      console.error("Teacher message error:", error);
    }
  }

  // -----------------------------------------
  // TEACHER-ONLY: REMOVE A STUDENT (by stable id)
  // -----------------------------------------

  @SubscribeMessage("remove-student")
  async removeStudentByTeacher(
    @MessageBody() payload: { studentId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (client.data.role !== "teacher" || !client.data.roomId) return;

      const roomId = client.data.roomId;
      const studentId =
        typeof payload?.studentId === "string" ? payload.studentId : "";

      if (!studentId) return;

      const meta = await this.redisService.getObject<RoomMeta>(
        this.roomMetaKey(roomId),
      );

      if (!meta || meta.teacherSocketId !== client.id) return;

      const raw = await this.redisService.hGet(
        this.roomUsersKey(roomId),
        studentId,
      );

      if (!raw) {
        client.emit("test-error", {
          message: "That student is no longer in the room.",
        });
        return;
      }

      const student = JSON.parse(raw) as Student;

      await this.redisService.hDel(this.roomUsersKey(roomId), studentId);
      await this.redisService.hSet(this.bannedKey(roomId), student.email, "1");
      await this.redisService.expire(this.bannedKey(roomId), ROOM_TTL_SECONDS);

      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );

      let answeredCount = 0;

      if (state && state.currentQuestionIndex >= 0) {
        const answerKey = this.answersKey(roomId, state.currentQuestionIndex);
        await this.redisService.hDel(answerKey, studentId);
        answeredCount = await this.redisService.hLen(answerKey);
      }

      const targets = await this.server.in(student.socketId).fetchSockets();

      for (const target of targets) {
        target.emit("removed-from-room", {
          message: "The teacher removed you from this quiz.",
        });
        target.leave(roomId);
      }

      const students = await this.getRoomStudents(roomId);
      const leaderboard = await this.getLeaderboard(roomId);

      this.server.to(roomId).emit("student-removed", {
        id: studentId,
        username: student.username,
        answeredCount,
      });

      this.server.to(meta.teacherSocketId).emit("room-users", students);
      this.server.to(roomId).emit("leaderboard-updated", leaderboard);

      console.log("Student removed by teacher:", student.username);
    } catch (error) {
      console.error("Remove student (teacher) error:", error);
      client.emit("test-error", { message: "Unable to remove the student." });
    }
  }

  // -----------------------------------------
  // START QUESTION
  // -----------------------------------------

  private async startQuestion(roomId: string, questionIndex: number) {
    const quiz = await this.redisService.getObject<QuizData>(
      this.quizKey(roomId),
    );
    const state = await this.redisService.getObject<TestState>(
      this.testStateKey(roomId),
    );
    const meta = await this.redisService.getObject<RoomMeta>(
      this.roomMetaKey(roomId),
    );

    if (!quiz || !state) return;

    if (questionIndex >= quiz.questions.length) {
      await this.finishTest(roomId);
      return;
    }

    const question = quiz.questions[questionIndex];
    const startedAt = Date.now();
    const endsAt = startedAt + state.durationSeconds * 1000;

    const nextState: TestState = {
      ...state,
      status: "running",
      currentQuestionIndex: questionIndex,
      questionStartedAt: startedAt,
      questionEndsAt: endsAt,
    };

    await this.redisService.setObject(
      this.testStateKey(roomId),
      nextState,
      ROOM_TTL_SECONDS,
    );

    if (meta) await this.touchRoom(roomId, meta.code);

    await this.redisService.delete(this.answersKey(roomId, questionIndex));

    this.server.to(roomId).emit("question-started", {
      question: this.toSafeQuestion(question),
      questionIndex,
      totalQuestions: quiz.questions.length,
      durationSeconds: state.durationSeconds,
      startedAt,
      endsAt,
      serverNow: Date.now(),
    });

    const existingTimer = this.questionTimers.get(roomId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      void this.finishQuestion(roomId, questionIndex);
    }, Math.max(0, endsAt - Date.now()));

    this.questionTimers.set(roomId, timer);
  }

  private emitQuestionToClient(
    client: Socket,
    state: TestState,
    questions: Question[],
  ) {
    const question = questions[state.currentQuestionIndex];
    if (!question) return;

    client.emit("question-started", {
      question: this.toSafeQuestion(question),
      questionIndex: state.currentQuestionIndex,
      totalQuestions: questions.length,
      durationSeconds: state.durationSeconds,
      startedAt: state.questionStartedAt,
      endsAt: state.questionEndsAt,
      serverNow: Date.now(),
    });
  }

  // -----------------------------------------
  // STUDENT SUBMITS ANSWER
  // -----------------------------------------

  @SubscribeMessage("submit-answer")
  async submitAnswer(
    @MessageBody()
    payload: { questionIndex: number; selectedOptionIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (client.data.role !== "student" || !client.data.roomId) return;

      const roomId = client.data.roomId;
      const studentId: string | undefined = client.data.id;

      if (!studentId) return;

      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );
      const quiz = await this.redisService.getObject<QuizData>(
        this.quizKey(roomId),
      );

      if (!state || !quiz || state.status !== "running") {
        client.emit("answer-error", {
          message: "This question is no longer accepting answers.",
        });
        return;
      }

      if (
        payload?.questionIndex !== state.currentQuestionIndex ||
        !Number.isInteger(payload?.selectedOptionIndex)
      ) {
        client.emit("answer-error", { message: "Invalid question or answer." });
        return;
      }

      if (Date.now() > (state.questionEndsAt ?? 0)) {
        client.emit("answer-error", { message: "Time is up!" });
        return;
      }

      const question = quiz.questions[state.currentQuestionIndex];

      if (
        !question ||
        payload.selectedOptionIndex < 0 ||
        payload.selectedOptionIndex >= question.options.length
      ) {
        client.emit("answer-error", { message: "Invalid option selected." });
        return;
      }

      const rawUser = await this.redisService.hGet(
        this.roomUsersKey(roomId),
        studentId,
      );
      const user = rawUser ? (JSON.parse(rawUser) as Student) : null;

      // Guard against a stale tab: the record must point at THIS socket.
      if (!user || !user.socketId || user.socketId !== client.id) {
        client.emit("answer-error", {
          message: "Your student session was not found.",
        });
        return;
      }

      const responseTimeMs = Math.max(
        0,
        Date.now() - (state.questionStartedAt ?? Date.now()),
      );

      const answerKey = this.answersKey(roomId, state.currentQuestionIndex);

      const stored = await this.redisService.hSetNx(
        answerKey,
        studentId,
        JSON.stringify({
          selectedOptionIndex: payload.selectedOptionIndex,
          responseTimeMs,
        }),
      );

      if (!stored) {
        client.emit("answer-error", {
          code: "ALREADY_ANSWERED",
          message: "You have already submitted your answer.",
        });
        return;
      }

      await this.redisService.expire(answerKey, ROOM_TTL_SECONDS);

      client.emit("answer-locked", {
        questionIndex: state.currentQuestionIndex,
        selectedOptionIndex: payload.selectedOptionIndex,
        responseTimeMs,
      });

      this.server.to(roomId).emit("answer-received", {
        id: studentId,
        answeredCount: await this.redisService.hLen(answerKey),
      });
    } catch (error) {
      console.error("Submit answer error:", error);
      client.emit("answer-error", { message: "Unable to submit your answer." });
    }
  }

  // -----------------------------------------
  // FINISH QUESTION (scoring + reveal only here)
  // -----------------------------------------

  private async finishQuestion(roomId: string, questionIndex: number) {
    const gotLock = await this.redisService.setNx(
      this.finishLockKey(roomId, questionIndex),
      "1",
      ROOM_TTL_SECONDS,
    );
    if (!gotLock) return;

    const state = await this.redisService.getObject<TestState>(
      this.testStateKey(roomId),
    );
    const quiz = await this.redisService.getObject<QuizData>(
      this.quizKey(roomId),
    );

    if (
      !state ||
      !quiz ||
      state.status !== "running" ||
      state.currentQuestionIndex !== questionIndex
    ) {
      return;
    }

    const timer = this.questionTimers.get(roomId);
    if (timer) clearTimeout(timer);
    this.questionTimers.delete(roomId);

    const question = quiz.questions[questionIndex];
    const correctOptionIndex = Number(question.correct_answer);
    const marks = Number(question.marks) || 0;

    await this.redisService.setObject(
      this.testStateKey(roomId),
      { ...state, status: "question-ended" },
      ROOM_TTL_SECONDS,
    );

    const answers = await this.redisService.hGetAll(
      this.answersKey(roomId, questionIndex),
    );
    const students = await this.getRoomStudents(roomId);

    const results: QuestionResult[] = [];
    const distribution = question.options.map(() => 0);

    await Promise.all(
      students.map(async (student) => {
        const raw = answers[student.id];

        if (!raw) {
          results.push({
            id: student.id,
            username: student.username,
            avatar: student.avatar,
            status: "unanswered",
            selectedOptionIndex: null,
            responseTimeMs: null,
            earnedMarks: 0,
          });

          this.server.to(student.socketId).emit("answer-result", {
            answered: false,
            isCorrect: false,
            earnedMarks: 0,
            selectedOptionIndex: null,
            responseTimeMs: null,
          });
          return;
        }

        const answer = JSON.parse(raw) as {
          selectedOptionIndex: number;
          responseTimeMs: number;
        };

        const isCorrect = answer.selectedOptionIndex === correctOptionIndex;
        const earnedMarks = isCorrect ? marks : 0;

        if (distribution[answer.selectedOptionIndex] !== undefined) {
          distribution[answer.selectedOptionIndex] += 1;
        }

        results.push({
          id: student.id,
          username: student.username,
          avatar: student.avatar,
          status: isCorrect ? "correct" : "wrong",
          selectedOptionIndex: answer.selectedOptionIndex,
          responseTimeMs: answer.responseTimeMs,
          earnedMarks,
        });

        student.score += earnedMarks;
        student.totalTimeMs += answer.responseTimeMs;
        student.answeredQuestions += 1;

        await this.redisService.hSet(
          this.roomUsersKey(roomId),
          student.id,
          JSON.stringify(student),
        );

        this.server.to(student.socketId).emit("answer-result", {
          answered: true,
          isCorrect,
          earnedMarks,
          selectedOptionIndex: answer.selectedOptionIndex,
          responseTimeMs: answer.responseTimeMs,
        });
      }),
    );

    const statusOrder = { correct: 0, wrong: 1, unanswered: 2 } as const;

    results.sort((a, b) => {
      if (a.status !== b.status) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (a.status === "unanswered") {
        return a.username.localeCompare(b.username);
      }
      return (a.responseTimeMs ?? 0) - (b.responseTimeMs ?? 0);
    });

    const lastResult: LastResult = {
      questionIndex,
      correctOptionIndex,
      results,
      distribution,
    };

    await this.redisService.setObject(
      this.lastResultKey(roomId),
      lastResult,
      ROOM_TTL_SECONDS,
    );

    const leaderboard = await this.getLeaderboard(roomId);

    this.server.to(roomId).emit("question-ended", {
      ...lastResult,
      leaderboard,
    });

    this.server.to(roomId).emit("leaderboard-updated", leaderboard);
  }

  // -----------------------------------------
  // TEACHER ENDS THE QUESTION EARLY / NEXT QUESTION
  // -----------------------------------------

  @SubscribeMessage("end-question")
  async endQuestion(@ConnectedSocket() client: Socket) {
    try {
      if (client.data.role !== "teacher" || !client.data.roomId) return;

      const roomId = client.data.roomId;
      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );

      if (!state || state.status !== "running") return;

      await this.finishQuestion(roomId, state.currentQuestionIndex);
    } catch (error) {
      console.error("End question error:", error);
      client.emit("test-error", { message: "Unable to end the question." });
    }
  }

  @SubscribeMessage("next-question")
  async nextQuestion(@ConnectedSocket() client: Socket) {
    try {
      if (client.data.role !== "teacher" || !client.data.roomId) return;

      const roomId = client.data.roomId;

      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );

      if (!state || state.status !== "question-ended") {
        client.emit("test-error", {
          message: "The current question has not ended yet.",
        });
        return;
      }

      await this.startQuestion(roomId, state.currentQuestionIndex + 1);
    } catch (error) {
      console.error("Next question error:", error);
      client.emit("test-error", { message: "Unable to load the next question." });
    }
  }

  // -----------------------------------------
  // LEADERBOARD
  // -----------------------------------------

  private async getRoomStudents(roomId: string): Promise<Student[]> {
    const users = await this.redisService.hGetAll(this.roomUsersKey(roomId));
    return Object.values(users).map((user) => JSON.parse(user) as Student);
  }

  private async getLeaderboard(roomId: string) {
    const students = await this.getRoomStudents(roomId);

    return students
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.totalTimeMs - b.totalTimeMs;
      })
      .map((student, index) => ({
        rank: index + 1,
        id: student.id,
        username: student.username,
        avatar: student.avatar,
        score: student.score,
        totalTimeMs: student.totalTimeMs,
        answeredQuestions: student.answeredQuestions,
        connected: student.connected,
      }));
  }

  // -----------------------------------------
  // FINISH TEST
  // -----------------------------------------

  private async finishTest(roomId: string) {
    const timer = this.questionTimers.get(roomId);
    if (timer) clearTimeout(timer);
    this.questionTimers.delete(roomId);

    const state = await this.redisService.getObject<TestState>(
      this.testStateKey(roomId),
    );

    if (!state) return;

    const meta = await this.redisService.getObject<RoomMeta>(
      this.roomMetaKey(roomId),
    );

    await this.redisService.setObject(
      this.testStateKey(roomId),
      {
        ...state,
        status: "finished",
        questionStartedAt: null,
        questionEndsAt: null,
      },
      ROOM_TTL_SECONDS,
    );

    const leaderboard = await this.getLeaderboard(roomId);

    this.server.to(roomId).emit("test-finished", {
      message: "The live test has finished!",
      leaderboard,
    });

    const graceSeconds = Math.ceil(FINISHED_GRACE_MS / 1000) + 60;

    await this.redisService.expireByPattern(
      this.roomPattern(roomId),
      graceSeconds,
    );

    if (meta) {
      await this.redisService.expire(this.roomCodeKey(meta.code), graceSeconds);
    }

    const existing = this.cleanupTimers.get(roomId);
    if (existing) clearTimeout(existing);

    this.cleanupTimers.set(
      roomId,
      setTimeout(() => {
        void this.destroyRoom(roomId, meta?.code);
      }, FINISHED_GRACE_MS),
    );
  }

  // -----------------------------------------
  // STUDENT DISCONNECT: keep their score, mark offline
  // -----------------------------------------

  private async onStudentDisconnected(client: Socket, roomId: string) {
    try {
      const studentId: string | undefined = client.data.id;
      if (!studentId) return;

      const meta = await this.redisService.getObject<RoomMeta>(
        this.roomMetaKey(roomId),
      );
      if (!meta) return;

      const raw = await this.redisService.hGet(
        this.roomUsersKey(roomId),
        studentId,
      );
      if (!raw) return;

      const student = JSON.parse(raw) as Student;

      // The student already reconnected on a newer socket. Ignore this old one.
      if (student.socketId !== client.id) return;

      // IMPORTANT: keep the record even in the lobby so a quick reconnect
      // (or page reload) re-attaches to the same row instead of starting
      // from scratch. Mark offline and clear the socket id.
      student.connected = false;
      student.socketId = "";

      await this.redisService.hSet(
        this.roomUsersKey(roomId),
        studentId,
        JSON.stringify(student),
      );

      const students = await this.getRoomStudents(roomId);
      const leaderboard = await this.getLeaderboard(roomId);

      this.server.to(meta.teacherSocketId).emit("student-left", {
        id: studentId,
        username: student.username,
        email: student.email,
      });
      this.server.to(meta.teacherSocketId).emit("room-users", students);
      this.server.to(roomId).emit("leaderboard-updated", leaderboard);
    } catch (error) {
      console.error("Student disconnect error:", error);
    }
  }

  // -----------------------------------------
  // TEACHER DISCONNECT: grace period before closing
  // -----------------------------------------

  private async onTeacherDisconnected(client: Socket, roomId: string) {
    try {
      const meta = await this.redisService.getObject<RoomMeta>(
        this.roomMetaKey(roomId),
      );

      if (!meta || meta.teacherSocketId !== client.id) return;

      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );

      if (state?.status === "finished") return;

      const old = this.teacherTimers.get(roomId);
      if (old) clearTimeout(old);

      this.teacherTimers.set(
        roomId,
        setTimeout(() => {
          void this.closeRoomIfTeacherGone(roomId, client.id);
        }, TEACHER_GRACE_MS),
      );
    } catch (error) {
      console.error("Teacher disconnect error:", error);
    }
  }

  private async closeRoomIfTeacherGone(roomId: string, oldSocketId: string) {
    try {
      this.teacherTimers.delete(roomId);

      const meta = await this.redisService.getObject<RoomMeta>(
        this.roomMetaKey(roomId),
      );

      if (!meta || meta.teacherSocketId !== oldSocketId) return;

      this.server.to(roomId).emit("room-ended", {
        message: "The teacher disconnected. This room has been closed.",
        roomId,
      });

      await this.destroyRoom(roomId, meta.code);
    } catch (error) {
      console.error("Close room error:", error);
    }
  }
}