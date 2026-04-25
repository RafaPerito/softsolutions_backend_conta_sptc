/*import { Injectable } from '@nestjs/common';
import { MeilisearchService } from '../../../infrastructure/search/meilisearch/meilisearch.service';
import { WhisperService } from '../../../infrastructure/speech/whisper/whisper.service';
import { SearchResponseDto } from '../../../infrastructure/search/dtos/search-response.dto';

@Injectable()
export class SearchVoiceUseCase {
  constructor(
    private readonly whisperService: WhisperService,
    private readonly meiliService: MeilisearchService,
  ) {}

  async execute(filePath: string): Promise<SearchResponseDto> {
    const transcription = await this.whisperService.transcribe(filePath);
    const results = transcription
      ? await this.meiliService.search(transcription)
      : [];

    return {
      transcription,
      results,
    };
  }
}   */