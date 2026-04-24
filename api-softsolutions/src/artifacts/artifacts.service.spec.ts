import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactsService } from './artifacts.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ArtifactsService', () => {
  let service: ArtifactsService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'AWS_REGION' || key === 'AWS_DEFAULT_REGION') return 'us-east-1';
        if (key === 'ARTIFACTS_S3_BUCKET') return 'bucket';
        if (key === 'ARTIFACTS_AVATARS_TABLE') return 'table';
        if (key === 'ARTIFACTS_PUBLIC_BASE_URL') return undefined;
        return undefined;
      }),
    } as any;
    service = new ArtifactsService(configService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  // Exemplo de teste para uploadAvatar
  it('deve lançar BadRequestException se file for nulo', async () => {
    await expect(service.uploadAvatar('userId', null as any)).rejects.toThrow(BadRequestException);
  });

  // Adicione mais testes para métodos e fluxos de erro conforme necessário
});
