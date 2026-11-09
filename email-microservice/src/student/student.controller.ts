import { Controller } from '@nestjs/common';

import {
    MessagePattern,
    Payload,
} from '@nestjs/microservices';

import { StudentService } from './student.service.js';

import { SendStudentInvitationDTO } from './dto/sendStudentInvitation.dto.js';

@Controller('student')
export class StudentController {

    constructor(
        private readonly studentService: StudentService,
    ) { }

    // SEND STUDENT INVITATION
    @MessagePattern({ cmd: 'send-student-invitation' })
    async sendStudentInvitation(
        @Payload() studentData: SendStudentInvitationDTO,
    ) {
        console.log(studentData);

        return this.studentService.sendStudentInvitation(studentData);
    }
}