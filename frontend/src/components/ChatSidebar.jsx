import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Smile } from 'lucide-react';

export const ChatSidebar = ({
  isOpen,
  onClose,
  messages = [],
  onSendMessage,
  onTyping,
  typingUsers = {},
  currentUserId,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Broadcast typing status
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim());
    setInputText('');
    if (onTyping) onTyping(false);
  };

  if (!isOpen) return null;

  const typingNames = Object.values(typingUsers)
    .filter((u) => u.isTyping && u.userId !== currentUserId)
    .map((u) => u.username);

  return (
    <div className="glass-panel floating-sidebar">
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Room Chat</h3>
        </div>
        <button onClick={onClose} className="btn btn-secondary btn-icon" style={{ width: '28px', height: '28px' }}>
          <X size={15} />
        </button>
      </div>

      {/* Messages List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px' }}>
            No messages yet. Say hello to your collaborators!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSystem = msg.type === 'system' || msg.senderId === 'system';
            const isMe = msg.senderId === currentUserId;

            if (isSystem) {
              return (
                <div
                  key={msg._id || index}
                  style={{
                    textAlign: 'center',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-full)',
                    margin: '4px auto',
                  }}
                >
                  {msg.message}
                </div>
              );
            }

            return (
              <div
                key={msg._id || index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {!isMe && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: msg.senderColor || '#6366f1',
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {msg.senderName}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isMe
                      ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                      : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontSize: '13px',
                    wordBreak: 'break-word',
                    boxShadow: isMe ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                    border: isMe ? 'none' : '1px solid var(--border-color)',
                  }}
                >
                  {msg.message}
                </div>

                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', padding: '0 4px' }}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div style={{ padding: '0 16px 6px', fontSize: '11px', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
          {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Message Input Box */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          type="text"
          className="input-field"
          placeholder="Type message and hit enter..."
          value={inputText}
          onChange={handleInputChange}
          style={{ padding: '8px 12px', fontSize: '13px' }}
        />
        <button type="submit" className="btn btn-primary btn-icon" disabled={!inputText.trim()}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
