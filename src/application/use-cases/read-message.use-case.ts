import { injectable, inject } from 'tsyringe';
import { PostalClient } from '../../lib/postal-client';
import { InboxStore } from '../../lib/inbox-store';

export interface ReadMessageInput {
  messageId: string;
  includeFull?: boolean;
  enableRetry?: boolean;
}

@injectable()
export class ReadMessageUseCase {
  constructor(
    @inject('PostalClient') private readonly postalClient: PostalClient,
    @inject('PostalClientRetryDisabled') private readonly postalClientRetryDisabled: PostalClient,
    @inject('InboxStore') private readonly inboxStore: InboxStore
  ) {}

  async execute(input: ReadMessageInput): Promise<unknown> {
    const expansions = input.includeFull
      ? ['status', 'details', 'inspection', 'plain_body', 'html_body', 'attachments', 'headers']
      : ['status', 'details', 'plain_body', 'inspection'];

    const client = input.enableRetry === false ? this.postalClientRetryDisabled : this.postalClient;
    const message = await client.getMessage(input.messageId, expansions);

    try {
      this.inboxStore.markAsRead(input.messageId);
    } finally {
      this.inboxStore.close();
    }

    return message;
  }
}
