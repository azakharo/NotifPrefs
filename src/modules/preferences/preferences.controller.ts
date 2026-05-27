import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import {
  UpdatePreferencesDto,
  EvaluateRequestDto,
  EvaluateResponseDto,
  UserPreferencesResponseDto,
} from './dto';

@Controller()
@ApiTags('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get('users/:userId/preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'User preferences',
    type: UserPreferencesResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPreferences(
    @Param('userId') userId: string,
  ): Promise<UserPreferencesResponseDto> {
    // METRIC: COUNTER - increment: http_requests_total{method="GET",endpoint="/users/:userId/preferences"}
    return this.preferencesService.getPreferences(userId);
  }

  @Post('users/:userId/preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Updated preferences',
    type: UserPreferencesResponseDto,
  })
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    // METRIC: COUNTER - increment: http_requests_total{method="POST",endpoint="/users/:userId/preferences"}
    return this.preferencesService.updatePreferences(userId, dto);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate if notification should be sent' })
  @ApiResponse({
    status: 200,
    description: 'Evaluation result',
    type: EvaluateResponseDto,
  })
  async evaluate(
    @Body() dto: EvaluateRequestDto,
  ): Promise<EvaluateResponseDto> {
    // METRIC: COUNTER - increment: http_requests_total{method="POST",endpoint="/evaluate"}
    return this.preferencesService.evaluate(dto);
  }
}
