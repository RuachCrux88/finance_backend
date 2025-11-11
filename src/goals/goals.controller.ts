import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateGoalDto } from './dto/create-goal.dto';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@Req() req: any, @Body() body: CreateGoalDto) {
    return this.goalsService.create(req.user.id, body);
  }

  // IMPORTANTE: Las rutas específicas (sin parámetros) deben ir ANTES de las rutas con parámetros
  @Get('user')
  findByUser(@Req() req: any) {
    return this.goalsService.findByUser(req.user.id);
  }

  // Rutas con parámetros específicos deben ir antes de rutas genéricas
  @Get('progress/:goalId')
  getProgress(@Req() req: any, @Param('goalId') goalId: string) {
    return this.goalsService.getProgress(goalId, req.user.id);
  }

  @Get('wallet/:walletId')
  findByWallet(@Req() req: any, @Param('walletId') walletId: string) {
    return this.goalsService.findByWallet(walletId, req.user.id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; targetAmount?: number; deadline?: string; status?: string }) {
    return this.goalsService.update(req.user.id, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.goalsService.delete(req.user.id, id);
  }
}

