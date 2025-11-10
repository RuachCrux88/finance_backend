import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  list(@Req() req, @Query('type') type?: CategoryType) {
    return this.svc.list(req.user.id, type);
  }

  @Post()
  create(@Req() req, @Body() dto: CreateCategoryDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.svc.remove(req.user.id, id);
  }
}
