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
} from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { StudentService } from './student.service.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { StudentQueryDto } from './dto/student-query.dto.js';



@Controller('students')
export class StudentController {
    constructor(
        private readonly studentsService: StudentService,
    ) { }

    // CREATE
    @Post()
    create(@Body() createStudentDto: CreateStudentDto) {
        return this.studentsService.create(createStudentDto);
    }

    // GET ALL / SEARCH
     @Get()
  findAll(@Query() queryDto: StudentQueryDto) {
    return this.studentsService.findAll(queryDto);
  }

    // GET BY ID
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.findOne(id);
    }

    // UPDATE
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateStudentDto: UpdateStudentDto,
    ) {
        return this.studentsService.update(id, updateStudentDto);
    }

    // DELETE
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.remove(id);
    }
}