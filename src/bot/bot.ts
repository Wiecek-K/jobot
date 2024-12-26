interface BotConfig {
  name: string;
  startupDelay: number;
  maxRetries: number;
}

interface TaskResult {
  success: boolean;
  message: string;
  timestamp: Date;
}

class Bot {
  private readonly name: string;
  private readonly startupDelay: number;
  private readonly maxRetries: number;
  private isRunning: boolean = false;
  private taskHistory: TaskResult[] = [];

  constructor(config: BotConfig) {
    this.name = config.name;
    this.startupDelay = config.startupDelay;
    this.maxRetries = config.maxRetries;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Bot is already running");
    }
    await this.delay(this.startupDelay);
    this.isRunning = true;
  }

  async executeTask(task: () => Promise<void>): Promise<TaskResult> {
    if (!this.isRunning) {
      return {
        success: false,
        message: "Bot is not running",
        timestamp: new Date(),
      };
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await task();
        const result = {
          success: true,
          message: `Task completed successfully on attempt ${attempt}`,
          timestamp: new Date(),
        };
        this.taskHistory.push(result);
        return result;
      } catch (error) {
        if (attempt === this.maxRetries) {
          const result = {
            success: false,
            message: `Task failed after ${this.maxRetries} attempts: ${error.message}`,
            timestamp: new Date(),
          };
          this.taskHistory.push(result);
          return result;
        }
        await this.delay(1000 * attempt); // Exponential backoff
      }
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  getTaskHistory(): TaskResult[] {
    return [...this.taskHistory];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
