import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { WalletsModule } from './wallets/wallets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';
import { GoalsModule } from './goals/goals.module';
import { InvitationsModule } from './invitations/invitations.module';
import { RemindersModule } from './reminders/reminders.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    WalletsModule,
    TransactionsModule,
    CategoriesModule,
    GoalsModule,
    InvitationsModule,
    RemindersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
