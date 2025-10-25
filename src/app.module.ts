import { Module } from '@nestjs/common';

import routes from './routes';
import { ExchangeMonitoringService } from './services/exchangeMonitoringService';
import { PriceService } from './services/priceService';
import { WatcherRegistry } from './services/watcherRegistry';

@Module({
  controllers: [...routes],
  providers: [PriceService, WatcherRegistry, ExchangeMonitoringService]
})
export class AppModule {}
