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
  async list(@Req() req, @Query('type') type?: CategoryType, @Query('walletId') walletId?: string) {
    try {
      return await this.svc.list(req.user.id, type, walletId);
    } catch (error: any) {
      console.error('Error listing categories:', error);
      throw error;
    }
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

  @Post('cleanup-duplicates')
  async cleanupDuplicates(@Req() req) {
    return this.svc.cleanupDuplicates(req.user.id);
  }
}
