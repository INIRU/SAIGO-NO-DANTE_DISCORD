export interface TranscriptMessage {
  id: string;
  author: { id: string; username: string; avatarURL: string | null; bot: boolean };
  content: string;
  createdAt: Date;
  attachments: { name: string; url: string }[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatContent(content: string): string {
  let html = escapeHtml(content);

  // Code blocks (multi-line)
  html = html.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Mentions
  html = html.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@$1</span>');
  html = html.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#$1</span>');
  html = html.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention role-mention">@$1</span>');

  // Newlines
  html = html.replace(/\n/g, '<br>');

  return html;
}

function formatDate(date: Date): string {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatTime(date: Date): string {
  return date.toLocaleString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getAvatarUrl(author: TranscriptMessage['author']): string {
  if (author.avatarURL) return author.avatarURL;
  const defaultIndex = parseInt(author.id) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

export function generateTranscript(
  messages: TranscriptMessage[],
  ticketInfo: { id: number; userId: string; createdAt: string; closedAt: string }
): string {
  // Group consecutive messages by same author
  const groups: { author: TranscriptMessage['author']; messages: TranscriptMessage[] }[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.author.id === msg.author.id) {
      last.messages.push(msg);
    } else {
      groups.push({ author: msg.author, messages: [msg] });
    }
  }

  const messageHtml = groups.map(group => {
    const first = group.messages[0];
    const avatarUrl = getAvatarUrl(group.author);
    const botBadge = group.author.bot ? '<span class="bot-badge">BOT</span>' : '';

    const msgContents = group.messages.map(msg => {
      const attachmentsHtml = msg.attachments.length > 0
        ? `<div class="attachments">${msg.attachments.map(a =>
            `<a class="attachment-link" href="${escapeHtml(a.url)}" target="_blank">📎 ${escapeHtml(a.name)}</a>`
          ).join('')}</div>`
        : '';

      const contentHtml = msg.content
        ? `<div class="message-content">${formatContent(msg.content)}</div>`
        : '';

      return `
        <div class="message-line">
          <span class="message-timestamp" title="${formatDate(msg.createdAt)}">${formatTime(msg.createdAt)}</span>
          ${contentHtml}
          ${attachmentsHtml}
        </div>`;
    }).join('');

    return `
    <div class="message-group">
      <div class="avatar-col">
        <img class="avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(group.author.username)}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
      </div>
      <div class="message-col">
        <div class="message-header">
          <span class="username">${escapeHtml(group.author.username)}</span>
          ${botBadge}
          <span class="header-timestamp">${formatDate(first.createdAt)}</span>
        </div>
        ${msgContents}
      </div>
    </div>`;
  }).join('');

  const totalMessages = messages.length;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>티켓 #${ticketInfo.id} - 트랜스크립트</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: #36393f;
      color: #dcddde;
      font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.375;
    }

    .page-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* Header */
    .ticket-header {
      background-color: #2f3136;
      border-bottom: 1px solid #202225;
      padding: 20px 24px;
    }

    .ticket-header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
    }

    .ticket-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #8e9297;
    }

    .meta-value {
      font-size: 14px;
      color: #dcddde;
    }

    .meta-divider {
      width: 1px;
      background-color: #4f545c;
      align-self: stretch;
    }

    /* Messages area */
    .messages-area {
      flex: 1;
      padding: 16px 0;
    }

    .message-count {
      padding: 8px 16px 16px;
      font-size: 12px;
      color: #8e9297;
      border-bottom: 1px solid #4f545c;
      margin-bottom: 8px;
    }

    .message-group {
      display: flex;
      padding: 4px 16px;
      gap: 16px;
      transition: background-color 0.1s;
    }

    .message-group:hover {
      background-color: rgba(0, 0, 0, 0.06);
    }

    .avatar-col {
      flex-shrink: 0;
      width: 40px;
      padding-top: 2px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .message-col {
      flex: 1;
      min-width: 0;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    .username {
      font-size: 16px;
      font-weight: 500;
      color: #ffffff;
    }

    .bot-badge {
      background-color: #5865f2;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      letter-spacing: 0.3px;
    }

    .header-timestamp {
      font-size: 12px;
      color: #72767d;
    }

    .message-line {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 1px 0;
    }

    .message-timestamp {
      flex-shrink: 0;
      font-size: 11px;
      color: #72767d;
      opacity: 0;
      width: 56px;
      text-align: right;
      padding-top: 2px;
      transition: opacity 0.1s;
    }

    .message-group:hover .message-timestamp {
      opacity: 1;
    }

    .message-content {
      flex: 1;
      font-size: 15px;
      color: #dcddde;
      word-break: break-word;
    }

    pre.code-block {
      background-color: #2f3136;
      border: 1px solid #202225;
      border-radius: 4px;
      padding: 8px 12px;
      margin: 4px 0;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
    }

    code.inline-code {
      background-color: #2f3136;
      border-radius: 3px;
      padding: 0 4px;
      font-size: 85%;
      font-family: 'Consolas', 'Courier New', monospace;
    }

    .mention {
      background-color: rgba(88, 101, 242, 0.3);
      color: #7289da;
      padding: 0 2px;
      border-radius: 3px;
      font-weight: 500;
    }

    .role-mention {
      background-color: rgba(250, 166, 26, 0.1);
      color: #faa61a;
    }

    .attachments {
      margin-top: 4px;
    }

    .attachment-link {
      display: inline-block;
      background-color: #2f3136;
      border: 1px solid #202225;
      border-radius: 4px;
      padding: 6px 10px;
      color: #00b0f4;
      text-decoration: none;
      font-size: 14px;
      margin: 2px 0;
    }

    .attachment-link:hover {
      text-decoration: underline;
    }

    /* Footer */
    .page-footer {
      background-color: #2f3136;
      border-top: 1px solid #202225;
      padding: 12px 24px;
      font-size: 12px;
      color: #8e9297;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <div class="ticket-header">
      <h1>🎫 티켓 #${ticketInfo.id} 트랜스크립트</h1>
      <div class="ticket-meta">
        <div class="meta-item">
          <span class="meta-label">티켓 번호</span>
          <span class="meta-value">#${ticketInfo.id}</span>
        </div>
        <div class="meta-divider"></div>
        <div class="meta-item">
          <span class="meta-label">생성자 ID</span>
          <span class="meta-value">${escapeHtml(ticketInfo.userId)}</span>
        </div>
        <div class="meta-divider"></div>
        <div class="meta-item">
          <span class="meta-label">열린 시각</span>
          <span class="meta-value">${escapeHtml(ticketInfo.createdAt)}</span>
        </div>
        <div class="meta-divider"></div>
        <div class="meta-item">
          <span class="meta-label">닫힌 시각</span>
          <span class="meta-value">${escapeHtml(ticketInfo.closedAt)}</span>
        </div>
      </div>
    </div>

    <div class="messages-area">
      <div class="message-count">${totalMessages}개의 메시지</div>
      ${messageHtml || '<div style="padding: 16px; color: #8e9297; font-style: italic;">메시지가 없습니다.</div>'}
    </div>

    <div class="page-footer">
      Limbus Company Discord Bot — 티켓 트랜스크립트
    </div>
  </div>
</body>
</html>`;
}
