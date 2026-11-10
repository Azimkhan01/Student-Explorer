
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Student } from '../entity/student.entity.js';
import { StudentEnrollment } from '../entity/student-enrollment.entity.js';
import { Exam } from '../entity/exam.entity.js';


type AuthUser = {
  id: number;
  role: 'admin' | 'teacher' | 'student';
};

@Injectable()
export class StudentExamResultService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,

    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,

    @InjectRepository(StudentEnrollment)
    private readonly enrollmentRepo: Repository<StudentEnrollment>,
  ) {}

  async getStudentExamResults(user: AuthUser) {
    // 1. Only students can access this endpoint.
    if (user.role !== 'student') {
      throw new ForbiddenException(
        'Only students can access exam results.',
      );
    }

    // 2. Find logged-in student.
    const student = await this.studentRepo.findOne({
      where: { id: user.id },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }

    // 3. Find the student's enrollments.
    const studentEnrollments = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.student', 'student')
      .innerJoinAndSelect('enrollment.class', 'classEntity')
      .innerJoinAndSelect(
        'enrollment.academicYear',
        'academicYear',
      )
      .where('student.id = :studentId', {
        studentId: student.id,
      })
      .getMany();

    if (!studentEnrollments.length) {
      return { exams: [] };
    }

    // 4. Find exams belonging to the student's class/year.
    const examQuery = this.examRepo
      .createQueryBuilder('exam')
      .innerJoinAndSelect('exam.classSubject', 'classSubject')
      .innerJoinAndSelect('classSubject.class', 'classEntity')
      .innerJoinAndSelect('classSubject.subject', 'subject')
      .innerJoinAndSelect(
        'classSubject.academicYear',
        'academicYear',
      )
      .leftJoinAndSelect('exam.results', 'result')
      .leftJoinAndSelect('result.student', 'resultStudent');

    examQuery.where(
      new Brackets((qb) => {
        studentEnrollments.forEach((enrollment, index) => {
          const condition =
            `classEntity.id = :classId${index} AND ` +
            `academicYear.id = :academicYearId${index}`;

          const parameters = {
            [`classId${index}`]: enrollment.class.id,
            [`academicYearId${index}`]: enrollment.academicYear.id,
          };

          if (index === 0) {
            qb.where(condition, parameters);
          } else {
            qb.orWhere(condition, parameters);
          }
        });
      }),
    );

    const exams = await examQuery
      .orderBy('exam.examDate', 'DESC')
      .addOrderBy('exam.id', 'DESC')
      .getMany();

    // Cache class enrollment lists so we don't fetch the same
    // class/year roster repeatedly for multiple subjects/exams.
    const enrollmentCache = new Map<string, Set<number>>();

    // 5. Prepare each exam's result and leaderboard.
    const formattedExams = await Promise.all(
      exams.map(async (exam) => {
        const classId = exam.classSubject.class.id;
        const academicYearId =
          exam.classSubject.academicYear.id;

        const cacheKey = `${classId}-${academicYearId}`;

        let enrolledStudentIds = enrollmentCache.get(cacheKey);

        if (!enrolledStudentIds) {
          // IMPORTANT: Fetch ALL students in this class/year.
          const classEnrollments = await this.enrollmentRepo
            .createQueryBuilder('enrollment')
            .innerJoinAndSelect(
              'enrollment.student',
              'enrolledStudent',
            )
            .innerJoin('enrollment.class', 'classEntity')
            .innerJoin(
              'enrollment.academicYear',
              'academicYear',
            )
            .where('classEntity.id = :classId', { classId })
            .andWhere('academicYear.id = :academicYearId', {
              academicYearId,
            })
            .getMany();

          enrolledStudentIds = new Set(
            classEnrollments.map(
              (enrollment) => enrollment.student.id,
            ),
          );

          enrollmentCache.set(cacheKey, enrolledStudentIds);
        }

        // 6. Include only submitted results from enrolled students.
        const leaderboard = (exam.results ?? [])
          .filter(
            (result) =>
              result.student &&
              enrolledStudentIds!.has(result.student.id),
          )
          .map((result) => ({
            studentId: result.student.id,
            username: result.student.username,
            marksObtained: result.marksObtained,
          }))
          .sort(
            (a, b) =>
              b.marksObtained - a.marksObtained ||
              a.username.localeCompare(b.username),
          );

        // 7. Calculate competition ranking.
        // Example: 1, 2, 2, 4.
        const rankedLeaderboard = leaderboard.map((result) => ({
          studentId: result.studentId,
          username: result.username,
          marksObtained: result.marksObtained,
          rank:
            leaderboard.findIndex(
              (item) =>
                item.marksObtained === result.marksObtained,
            ) + 1,
        }));

        // 8. Find logged-in student's result and rank.
        const myResult = (exam.results ?? []).find(
          (result) =>
            result.student?.id === student.id &&
            enrolledStudentIds!.has(result.student.id),
        );

        const myRank = myResult
          ? rankedLeaderboard.find(
              (result) => result.studentId === student.id,
            )?.rank ?? null
          : null;

        // 9. Calculate class statistics.
        const marks = leaderboard.map(
          (result) => result.marksObtained,
        );

        const highestMarks = marks.length
          ? Math.max(...marks)
          : 0;

        const averageMarks = marks.length
          ? marks.reduce((total, mark) => total + mark, 0) /
            marks.length
          : 0;

        // 10. Find topper.
        const winner = rankedLeaderboard.length
          ? {
              username: rankedLeaderboard[0].username,
              marksObtained:
                rankedLeaderboard[0].marksObtained,
            }
          : null;

        const classEntity = exam.classSubject.class;

        return {
          examId: exam.id,
          examName: exam.examName,
          subjectName: exam.classSubject.subject.subjectName,
          examDate: exam.examDate,
          maxMarks: exam.maxMarks,

          className: classEntity.division
            ? `${classEntity.standard} - ${classEntity.division}`
            : String(classEntity.standard),

          academicYear:
            exam.classSubject.academicYear.yearName,

          myResult: myResult
            ? {
                marksObtained: myResult.marksObtained,
                remarks: myResult.remarks,
              }
            : null,

          rank: myRank,
          totalStudents: leaderboard.length,
          highestMarks,
          averageMarks,
          winner,
          leaderboard: rankedLeaderboard,
        };
      }),
    );

    return {
      exams: formattedExams,
    };
  }
}
