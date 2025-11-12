import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryTypeEnum } from '../common/enums';
import type { CategoryTypeValue } from '../common/enums';
import { JwtAuthGuard } from '../auth/jwt.guard';

function parseCategoryType(type?: string): CategoryTypeValue | undefined {
  if (!type) return undefined;
  const upper = type.toUpperCase();
  if (upper in CategoryTypeEnum) {
    return CategoryTypeEnum[upper as keyof typeof CategoryTypeEnum];
  }
  return undefined;
}

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  list(
    @Req() req,
    @Query('type') type?: string,
    @Query('walletId') walletId?: string,
  ) {
    const parsedType = parseCategoryType(type);
    return this.svc.list(req.user.id, parsedType, walletId);
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
  cleanupDuplicates(@Req() req) {
    return this.svc.cleanupDuplicates(req.user.id);
  }
}
