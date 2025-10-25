import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Query
} from '@nestjs/common';
import { z } from 'zod';

import { listExchangeAccounts } from '../config/exchangeAccounts';
import {
  AccountNotFoundError,
  ExchangeMonitoringService,
  OperationNotSupportedError,
  UnsupportedExchangeError
} from '../services/exchangeMonitoringService';

// 交易所账户监控接口：暴露交易记录、仓位和委托的拉取能力
const paginationSchema = z.object({
  symbol: z.string().optional(),
  since: z
    .string()
    .transform((value) => Number(value))
    .pipe(z.number().nonnegative())
    .optional(),
  limit: z
    .string()
    .transform((value) => Number(value))
    .pipe(z.number().int().positive())
    .optional()
});

const positionsQuerySchema = z.object({
  symbol: z.string().optional()
});

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly exchangeMonitoringService: ExchangeMonitoringService
  ) {}

  @Get()
  listAccounts() {
    const accounts = listExchangeAccounts().map((account) => ({
      id: account.id,
      exchange: account.exchange,
      address: account.address
    }));

    return { data: accounts };
  }

  @Get(':accountId/transactions')
  async getTransactions(
    @Param('accountId') accountId: string,
    @Query() query: Record<string, unknown>
  ) {
    const parseResult = paginationSchema.safeParse(query);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.format());
    }

    try {
      const transactions = await this.exchangeMonitoringService.fetchAccountTransactions(
        accountId,
        parseResult.data
      );
      return { data: transactions };
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof UnsupportedExchangeError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof OperationNotSupportedError) {
        throw new HttpException(error.message, HttpStatus.NOT_IMPLEMENTED);
      }

      throw new HttpException('交易记录暂不可用', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get(':accountId/positions')
  async getPositions(
    @Param('accountId') accountId: string,
    @Query() query: Record<string, unknown>
  ) {
    const parseResult = positionsQuerySchema.safeParse(query);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.format());
    }

    try {
      const positions = await this.exchangeMonitoringService.fetchAccountPositions(
        accountId,
        parseResult.data.symbol
      );
      return { data: positions };
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof UnsupportedExchangeError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof OperationNotSupportedError) {
        throw new HttpException(error.message, HttpStatus.NOT_IMPLEMENTED);
      }

      throw new HttpException('仓位数据暂不可用', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get(':accountId/open-orders')
  async getOpenOrders(
    @Param('accountId') accountId: string,
    @Query() query: Record<string, unknown>
  ) {
    const parseResult = paginationSchema.safeParse(query);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.format());
    }

    try {
      const orders = await this.exchangeMonitoringService.fetchAccountOpenOrders(
        accountId,
        parseResult.data
      );
      return { data: orders };
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof UnsupportedExchangeError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof OperationNotSupportedError) {
        throw new HttpException(error.message, HttpStatus.NOT_IMPLEMENTED);
      }

      throw new HttpException('委托列表暂不可用', HttpStatus.BAD_GATEWAY);
    }
  }
}
