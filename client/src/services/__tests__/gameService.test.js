import gameService from '../gameService';
import apiClient from '../apiClient';

jest.mock('../apiClient');

describe('gameService - Adaptive Difficulty Engine', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return baseline MEDIUM difficulty if patientId is not provided', async () => {
    const result = await gameService.getAdaptiveDifficulty(null);
    expect(result.difficulty).toBe('MEDIUM');
    expect(result.optionsCount).toBe(3);
    expect(result.reason).toMatch(/baseline/i);
  });

  it('should adapt to EASY (2 options) when average accuracy is below 50%', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        difficulty: 'EASY',
        optionsCount: 2,
        avgAccuracy: 40,
        reason: 'Patient average accuracy is 40%. Adapting game to EASY mode.'
      }
    });

    const result = await gameService.getAdaptiveDifficulty('patient-123');
    expect(result.difficulty).toBe('EASY');
    expect(result.optionsCount).toBe(2);
  });

  it('should adapt to HARD (4 options) when average accuracy is 85% or above', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        difficulty: 'HARD',
        optionsCount: 4,
        avgAccuracy: 92,
        reason: 'Patient average accuracy is 92%. Adapting game to HARD mode.'
      }
    });

    const result = await gameService.getAdaptiveDifficulty('patient-123');
    expect(result.difficulty).toBe('HARD');
    expect(result.optionsCount).toBe(4);
  });

  it('should fallback gracefully to MEDIUM when the network fails', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Network error'));

    const result = await gameService.getAdaptiveDifficulty('patient-123');
    expect(result.difficulty).toBe('MEDIUM');
    expect(result.optionsCount).toBe(3);
  });
});
