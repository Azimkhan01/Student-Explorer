
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

import { Server, Socket } from "socket.io";
import { RedisService } from "../utils/redis/redis.service.js";

interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_answer: string | number;
  marks: number;
}

interface Student {
  socketId: string;
  email: string;
  username: string;
  score: number;
  totalTimeMs: number;
  answeredQuestions: number;
}

interface RoomMeta {
  roomId: string;
  code: number;
  teacherSocketId: string;
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

@WebSocketGateway({
  namespace: "/",
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
export class CreateSocket
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private questionTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly redisService: RedisService) {}

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

  afterInit(server: Server) {
    console.log("Live Quiz Socket Gateway Initialized");
  }

  handleConnection(client: Socket) {
    console.log("Client connected:", client.id);
  }

  // -----------------------------------------
  // DISCONNECT
  // -----------------------------------------

  async handleDisconnect(client: Socket) {
    console.log("Client disconnected:", client.id);

    const { role, roomId } = client.data;

    if (!roomId) return;

    if (role === "teacher") {
      await this.endTeacherRoom(client, roomId);
      return;
    }

    if (role === "student") {
      await this.removeStudent(client, roomId);
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
      const existingRoom = await this.redisService.get(codeKey);

      if (existingRoom) {
        client.emit("room-error", {
          message: "Room code already exists. Please try again.",
        });
        return;
      }

      const teacherId = String(payload.teacher_id);

      const roomId =
        `${payload.code}-${payload.quickzyId}-${teacherId}`;

      const meta: RoomMeta = {
        roomId,
        code: payload.code,
        teacherSocketId: client.id,
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

      await client.join(roomId);

      client.data.role = "teacher";
      client.data.roomId = roomId;

      await this.redisService.set(codeKey, roomId);
      await this.redisService.setObject(this.roomMetaKey(roomId), meta);
      await this.redisService.setObject(this.quizKey(roomId), {
        questions: payload.questions,
      });
      await this.redisService.setObject(
        this.testStateKey(roomId),
        initialState,
      );

      client.emit("room-created", {
        roomId,
        code: payload.code,
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
  // JOIN ROOM
  // -----------------------------------------

  @SubscribeMessage("join-room")
  async joinRoom(
    @MessageBody()
    payload: {
      code: number;
      email: string;
      username: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (
        !payload ||
        !Number.isInteger(payload.code) ||
        !payload.email ||
        !payload.username
      ) {
        client.emit("room-error", {
          message: "Please provide valid student information and room code.",
        });
        return;
      }

      const roomId = await this.redisService.get(
        this.roomCodeKey(payload.code),
      );

      if (!roomId) {
        client.emit("room-error", {
          message: "Invalid room code. Room does not exist.",
        });
        return;
      }

      const meta = await this.redisService.getObject<RoomMeta>(
        this.roomMetaKey(roomId),
      );

      if (!meta) {
        client.emit("room-error", {
          message: "Room information is missing.",
        });
        return;
      }

      await client.join(roomId);

      client.data.role = "student";
      client.data.roomId = roomId;
      client.data.email = payload.email;
      client.data.username = payload.username;

      const student: Student = {
        socketId: client.id,
        email: payload.email,
        username: payload.username,
        score: 0,
        totalTimeMs: 0,
        answeredQuestions: 0,
      };

      await this.redisService.hSet(
        this.roomUsersKey(roomId),
        client.id,
        JSON.stringify(student),
      );

      const students = await this.getRoomStudents(roomId);

      this.server.to(meta.teacherSocketId).emit("student-joined", student);
      this.server.to(meta.teacherSocketId).emit("room-users", students);

      client.emit("room-joined", {
        roomId,
        code: payload.code,
        message: "Successfully joined the live quiz.",
      });

      // If the test is already running, send the current question.
      const state = await this.redisService.getObject<TestState>(
        this.testStateKey(roomId),
      );

      const quiz = await this.redisService.getObject<QuizData>(
        this.quizKey(roomId),
      );

      if (
        state?.status === "running" &&
        quiz?.questions[state.currentQuestionIndex]
      ) {
        this.emitQuestionToStudent(client, state, quiz.questions);
      }

      const leaderboard = await this.getLeaderboard(roomId);
      client.emit("leaderboard-updated", leaderboard);

      console.log("Student joined:", student.username);
    } catch (error) {
      console.error("Join room error:", error);

      client.emit("room-error", {
        message: "Something went wrong while joining the room.",
      });
    }
  }

  // -----------------------------------------
  // TEACHER STARTS THE TEST
  // -----------------------------------------

  @SubscribeMessage("start-test")
  async startTest(
    @MessageBody()
    payload: { durationSeconds?: number },
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
        client.emit("test-error", {
          message: "Quiz information is missing.",
        });
        return;
      }

      if (state.status !== "waiting") {
        client.emit("test-error", {
          message: "The test has already started.",
        });
        return;
      }

      const durationSeconds = Math.min(
        300,
        Math.max(5, Number(payload?.durationSeconds) || 20),
      );

      await this.redisService.setObject(this.testStateKey(roomId), {
        ...state,
        durationSeconds,
      });

      await this.startQuestion(roomId, 0);
    } catch (error) {
      console.error("Start test error:", error);
      client.emit("test-error", {
        message: "Unable to start the test.",
      });
    }
  }

  // -----------------------------------------
  // START QUESTION
  // -----------------------------------------

  private async startQuestion(
    roomId: string,
    questionIndex: number,
  ) {
    const quiz = await this.redisService.getObject<QuizData>(
      this.quizKey(roomId),
    );

    const state = await this.redisService.getObject<TestState>(
      this.testStateKey(roomId),
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
    );

    await this.redisService.delete(
      this.answersKey(roomId, questionIndex),
    );

    // Never send correct_answer to students.
    const safeQuestion = {
      id: question.id,
      question: question.question,
      options: question.options,
      marks: question.marks,
    };

    this.server.to(roomId).emit("question-started", {
      question: safeQuestion,
      questionIndex,
      totalQuestions: quiz.questions.length,
      durationSeconds: state.durationSeconds,
      startedAt,
      endsAt,
    });

    const existingTimer = this.questionTimers.get(roomId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      void this.finishQuestion(roomId, questionIndex);
    }, Math.max(0, endsAt - Date.now()));

    this.questionTimers.set(roomId, timer);
  }

  private emitQuestionToStudent(
    client: Socket,
    state: TestState,
    questions: Question[],
  ) {
    const question = questions[state.currentQuestionIndex];
    if (!question) return;

    client.emit("question-started", {
      question: {
        id: question.id,
        question: question.question,
        options: question.options,
        marks: question.marks,
      },
      questionIndex: state.currentQuestionIndex,
      totalQuestions: questions.length,
      durationSeconds: state.durationSeconds,
      startedAt: state.questionStartedAt,
      endsAt: state.questionEndsAt,
    });
  }

  // -----------------------------------------
  // STUDENT SUBMITS ANSWER
  // -----------------------------------------

  @SubscribeMessage("submit-answer")
  async submitAnswer(
    @MessageBody()
    payload: {
      questionIndex: number;
      selectedOptionIndex: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (client.data.role !== "student" || !client.data.roomId) return;

      const roomId = client.data.roomId;

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
        payload.questionIndex !== state.currentQuestionIndex ||
        !Number.isInteger(payload.selectedOptionIndex)
      ) {
        client.emit("answer-error", {
          message: "Invalid question or answer.",
        });
        return;
      }

      if (Date.now() > (state.questionEndsAt ?? 0)) {
        client.emit("answer-error", {
          message: "Time is up!",
        });
        return;
      }

      const question = quiz.questions[state.currentQuestionIndex];

      if (
        !question ||
        payload.selectedOptionIndex < 0 ||
        payload.selectedOptionIndex >= question.options.length
      ) {
        client.emit("answer-error", {
          message: "Invalid option selected.",
        });
        return;
      }

      const answerKey = this.answersKey(roomId, state.currentQuestionIndex);

      const alreadyAnswered = await this.redisService.hExists(
        answerKey,
        client.id,
      );

      if (alreadyAnswered) {
        client.emit("answer-error", {
          message: "You have already submitted your answer.",
        });
        return;
      }

      const userString = await this.redisService.hGet(
        this.roomUsersKey(roomId),
        client.id,
      );

      if (!userString) {
        client.emit("answer-error", {
          message: "Your student session was not found.",
        });
        return;
      }

      const student: Student = JSON.parse(userString);

      const responseTimeMs = Math.max(
        0,
        Date.now() - (state.questionStartedAt ?? Date.now()),
      );

      const correctOptionIndex = Number(question.correct_answer);
      const isCorrect =
        payload.selectedOptionIndex === correctOptionIndex;

      const earnedMarks = isCorrect ? Number(question.marks) || 0 : 0;

      student.score += earnedMarks;
      student.totalTimeMs += responseTimeMs;
      student.answeredQuestions += 1;

      // One answer per socket per question.
      await this.redisService.hSet(
        answerKey,
        client.id,
        JSON.stringify({
          selectedOptionIndex: payload.selectedOptionIndex,
          isCorrect,
          responseTimeMs,
          earnedMarks,
        }),
      );

      await this.redisService.hSet(
        this.roomUsersKey(roomId),
        client.id,
        JSON.stringify(student),
      );

      client.emit("answer-result", {
        isCorrect,
        earnedMarks,
        responseTimeMs,
        message: isCorrect ? "Correct answer!" : "Incorrect answer.",
      });

      const leaderboard = await this.getLeaderboard(roomId);

      this.server.to(roomId).emit("leaderboard-updated", leaderboard);

      this.server.to(roomId).emit("answer-received", {
        username: student.username,
        answeredCount: await this.redisService.hLen(answerKey),
      });
    } catch (error) {
      console.error("Submit answer error:", error);

      client.emit("answer-error", {
        message: "Unable to submit your answer.",
      });
    }
  }

  // -----------------------------------------
  // FINISH QUESTION
  // -----------------------------------------

  private async finishQuestion(
    roomId: string,
    questionIndex: number,
  ) {
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

    await this.redisService.setObject(this.testStateKey(roomId), {
      ...state,
      status: "question-ended",
    });

    const leaderboard = await this.getLeaderboard(roomId);

    this.server.to(roomId).emit("question-ended", {
      questionIndex,
      correctOptionIndex: Number(question.correct_answer),
      leaderboard,
    });

    this.server.to(roomId).emit("leaderboard-updated", leaderboard);
  }

  // -----------------------------------------
  // TEACHER MOVES TO NEXT QUESTION
  // -----------------------------------------

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
      client.emit("test-error", {
        message: "Unable to load the next question.",
      });
    }
  }

  // -----------------------------------------
  // LEADERBOARD
  // -----------------------------------------

  private async getRoomStudents(roomId: string): Promise<Student[]> {
    const users = await this.redisService.hGetAll(
      this.roomUsersKey(roomId),
    );

    return Object.values(users).map((user) => JSON.parse(user));
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
        socketId: student.socketId,
        username: student.username,
        score: student.score,
        totalTimeMs: student.totalTimeMs,
        answeredQuestions: student.answeredQuestions,
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

    await this.redisService.setObject(this.testStateKey(roomId), {
      ...state,
      status: "finished",
      questionStartedAt: null,
      questionEndsAt: null,
    });

    const leaderboard = await this.getLeaderboard(roomId);

    this.server.to(roomId).emit("test-finished", {
      message: "The live test has finished!",
      leaderboard,
    });
  }

  // -----------------------------------------
  // STUDENT DISCONNECT
  // -----------------------------------------

  private async removeStudent(client: Socket, roomId: string) {
    try {
      const meta = await this.redisService.getObject<RoomMeta>(
        this.roomMetaKey(roomId),
      );

      if (!meta) return;

      await this.redisService.hDel(
        this.roomUsersKey(roomId),
        client.id,
      );

      const students = await this.getRoomStudents(roomId);
      const leaderboard = await this.getLeaderboard(roomId);

      this.server.to(meta.teacherSocketId).emit("student-left", {
        socketId: client.id,
        username: client.data.username,
        email: client.data.email,
      });

      this.server.to(meta.teacherSocketId).emit("room-users", students);
      this.server.to(roomId).emit("leaderboard-updated", leaderboard);
    } catch (error) {
      console.error("Remove student error:", error);
    }
  }

  // -----------------------------------------
  // TEACHER DISCONNECTS
  // -----------------------------------------

  private async endTeacherRoom(client: Socket, roomId: string) {
    try {
      const meta = await this.redisService.getObject<RoomMeta>(
        this.roomMetaKey(roomId),
      );

      if (!meta || meta.teacherSocketId !== client.id) return;

      const timer = this.questionTimers.get(roomId);
      if (timer) clearTimeout(timer);
      this.questionTimers.delete(roomId);

      this.server.to(roomId).emit("room-ended", {
        message: "The teacher disconnected. This room has been closed.",
        roomId,
      });

      await this.redisService.delete(this.roomCodeKey(meta.code));
      await this.redisService.delete(this.roomMetaKey(roomId));
      await this.redisService.delete(this.roomUsersKey(roomId));
      await this.redisService.delete(this.quizKey(roomId));
      await this.redisService.delete(this.testStateKey(roomId));

      console.log("Live quiz room deleted:", roomId);
    } catch (error) {
      console.error("End teacher room error:", error);
    }
  }
}
