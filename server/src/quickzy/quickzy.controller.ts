import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';
import { QuickzyService } from './quickzy.service.js';
import { UpdateQuickzyDTO } from './dto/update-quickzy.dto.js';
import { CreateQuickzyDTO } from './dto/create-quickzy.dto.js';
import { JwtAuthGuard } from '../utils/guard/jwt-auth.guard.js';
import { RolesGuard } from '../utils/guard/roles.guard.js';
import { Roles } from '../utils/decorator/roles.decorator.js';

@Controller('quickzy')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('teacher')
export class QuickzyController {
  constructor(private readonly quickzyService: QuickzyService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateQuickzyDTO) {
    const teacherId = Number((req as any).user.id);

    return this.quickzyService.create(teacherId, dto);
  }

  @Get()
  findAll(@Req() req: Request) {
    const teacherId = Number((req as any).user.id);

    return this.quickzyService.findAllByTeacher(teacherId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const teacherId = Number((req as any).user.id);

    return this.quickzyService.findOne(id, teacherId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateQuickzyDTO,
  ) {
    const teacherId = Number((req as any).user.id);

    return this.quickzyService.update(id, teacherId, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const teacherId = Number((req as any).user.id);

    return this.quickzyService.remove(id, teacherId);
  }
}