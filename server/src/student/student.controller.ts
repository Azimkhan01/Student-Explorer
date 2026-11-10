import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { StudentService } from './student.service.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { StudentQueryDto } from './dto/student-query.dto.js';
import { JwtAuthGuard } from '../utils/guard/jwt-auth.guard.js';
import { RolesGuard } from '../utils/guard/roles.guard.js';
import { Roles } from '../utils/decorator/roles.decorator.js';



@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
    constructor(
        private readonly studentsService: StudentService,
    ) { }

    // CREATE
    @Post()
    @Roles('admin')
    create(@Body() createStudentDto: CreateStudentDto) {
        return this.studentsService.create(createStudentDto);
    }

    // GET ALL / SEARCH
    @Get()
    @Roles('admin', 'student', 'teacher')
    findAll(@Query() queryDto: StudentQueryDto) {
        return this.studentsService.findAll(queryDto);
    }

    // GET BY ID
    @Get(':id')
    @Roles('admin', 'student', 'teacher')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.findOne(id);
    }

    // UPDATE
    @Patch(':id')
    @Roles('admin')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateStudentDto: UpdateStudentDto,
    ) {
        return this.studentsService.update(id, updateStudentDto);
    }

    // DELETE
    @Delete(':id')
    @Roles('admin')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.remove(id);
    }

    
}