import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService } from './artifacts.service';
import { BadRequestException } from '@nestjs/common';

describe('ArtifactsController', () => {
  let controller: ArtifactsController;
  let service: ArtifactsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtifactsController],
      providers: [
        {
          provide: ArtifactsService,
          useValue: {
            uploadAvatar: jest.fn(),
            getAvatar: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ArtifactsController>(ArtifactsController);
    service = module.get<ArtifactsService>(ArtifactsService);
  });

  describe('uploadAvatar', () => {
    it('deve lançar exceção se userId não existir', async () => {
      const file = { buffer: Buffer.from(''), mimetype: 'image/png', size: 10 };
      await expect(controller.uploadAvatar({}, file as any)).rejects.toThrow(BadRequestException);
    });

    it('deve chamar service.uploadAvatar com userId e file', async () => {
      const req = { user: { id: '123' } };
      const file = { originalname: 'avatar.png' } as any;
      (service.uploadAvatar as jest.Mock).mockResolvedValue('ok');
      const result = await controller.uploadAvatar(req, file);
      expect(service.uploadAvatar).toHaveBeenCalledWith('123', file);
      expect(result).toBe('ok');
    });
  });

  describe('getAvatar', () => {
    it('deve chamar service.getAvatar com userId', async () => {
      const req = { user: { id: '456' } };
      (service.getAvatar as jest.Mock).mockResolvedValue('avatarData');
      const result = await controller.getAvatar(req);
      expect(service.getAvatar).toHaveBeenCalledWith('456');
      expect(result).toBe('avatarData');
    });
  });
});
