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

  it('deve lançar BadRequestException se file for nulo', async () => {
    await expect(service.uploadAvatar('userId', null as any)).rejects.toThrow(BadRequestException);
  });

  it('deve fazer upload de avatar com arquivo válido', async () => {
    const file = {
      buffer: Buffer.from('fake'),
      mimetype: 'image/png',
      size: 123,
      originalname: 'avatar.png',
    };
    service['s3Client'].send = jest.fn().mockResolvedValue({});
    service['ddbDocClient'].send = jest.fn().mockResolvedValue({});
    const result = await service.uploadAvatar('userId', file as any);
    expect(result).toHaveProperty('avatarId');
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('message', 'Upload realizado com sucesso');
  });

  it('deve construir url pública se publicBaseUrl estiver definido', async () => {
    service['publicBaseUrl'] = 'https://meusite.com';
    const url = service['buildAvatarUrl']('avatars/user/aid.png');
    expect(url).toBe('https://meusite.com/avatars/user/aid.png');
  });

  it('deve construir url padrão se publicBaseUrl não estiver definido', async () => {
    service['publicBaseUrl'] = undefined;
    service['bucketName'] = 'bucket';
    service['region'] = 'us-east-1';
    const url = service['buildAvatarUrl']('avatars/user/aid.png');
    expect(url).toBe('https://bucket.s3.us-east-1.amazonaws.com/avatars/user/aid.png');
  });

  it('deve lançar NotFoundException se avatar não encontrado', async () => {
    service['ddbDocClient'].send = jest.fn().mockResolvedValue({ Items: [] });
    await expect(service.getAvatar('userId')).rejects.toThrow(NotFoundException);
  });

  it('deve retornar o avatar mais recente', async () => {
    const now = new Date();
    const items = [
      { createdAt: new Date(now.getTime() - 1000).toISOString(), s3Key: 'old', avatarId: '1', userId: 'u', mimeType: 'image/png', fileSize: 1 },
      { createdAt: now.toISOString(), s3Key: 'new', avatarId: '2', userId: 'u', mimeType: 'image/png', fileSize: 2 },
    ];
    service['ddbDocClient'].send = jest.fn().mockResolvedValue({ Items: items });
    service['buildAvatarUrl'] = jest.fn().mockReturnValue('url');
    const result = await service.getAvatar('userId');
    expect(result.avatarId).toBe('2');
    expect(result.url).toBe('url');
  });

  it('deve extrair extensão do arquivo corretamente', () => {
    const file = { originalname: 'foto.jpeg', mimetype: 'image/jpeg' };
    expect(service['extractExtension'](file as any)).toBe('jpeg');
  });

  it('deve extrair extensão do mimetype se originalname não existir', () => {
    const file = { originalname: '', mimetype: 'image/png' };
    expect(service['extractExtension'](file as any)).toBe('png');
  });

  it('deve retornar undefined se não houver extensão nem mimetype', () => {
    const file = { originalname: '', mimetype: '' };
    expect(service['extractExtension'](file as any)).toBe(undefined);
  });
});
