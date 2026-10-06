import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, IconButton, TextField, Fab, Typography, Avatar, Badge, Dialog } from '@mui/material';
import { Chat as ChatIcon, Close, Send, Download } from '@mui/icons-material';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Box chat noi o goc man hinh, cho user thuong nhan tin truc tiep voi Admin
// ngay tai trang chu ma khong can chuyen sang trang /chat rieng.
const FloatingChatWidget = () => {
  const { user } = useAuth();
  const { messages, sendMessage, isConnected, unreadCount, markAsRead } = useChat();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const isNearBottomRef = useRef(true);

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleScroll = () => {
    isNearBottomRef.current = isNearBottom();
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Khi mo box chat: cuon xuong cuoi + danh dau da doc
  useEffect(() => {
    if (open) {
      isNearBottomRef.current = true;
      setTimeout(scrollToBottom, 100);
      markAsRead();
    }
  }, [open]);

  // Chi tu dong cuon xuong khi co tin nhan moi VA dang o gan day khung chat
  // (giong Messenger: neu dang keo len xem tin cu thi khong bi day xuong)
  useEffect(() => {
    if (open && isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    isNearBottomRef.current = true;
    await sendMessage(text);
    setText('');
    setSending(false);
    setTimeout(scrollToBottom, 50);
  };

  // Tai anh ve may (hoat dong ca voi anh khac origin, khong bi mo tab moi)
  const handleDownloadImage = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = url.split('/').pop() || 'image.jpg';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download error:', e);
      toast.error('Không thể tải ảnh xuống');
    }
  };

  const renderMessage = (msg) => {
    if (msg.isRecalled) {
      return <em>Tin nhắn đã được thu hồi</em>;
    }
    const imageMatch = msg.message.match(/!\[.*\]\((.*)\)/);
    if (imageMatch) {
      const url = imageMatch[1];
      return (
        <img
          src={url}
          alt="image"
          onClick={() => setLightboxUrl(url)}
          style={{ maxWidth: '180px', borderRadius: '8px', cursor: 'pointer', display: 'block' }}
        />
      );
    }
    const fileMatch = msg.message.match(/📎\s*\[(.*)\]\((.*)\)/);
    if (fileMatch) {
      return (
        <a href={fileMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
          📎 {fileMatch[1]}
        </a>
      );
    }
    return msg.message;
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999 }}>
      {open && (
        <Paper
          sx={{
            width: 320,
            maxWidth: '85vw',
            height: 420,
            mb: 2,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
          }}
        >
          {/* Header */}
          <Box sx={{
            bgcolor: '#007bff',
            color: 'white',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 32, height: 32 }}>A</Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>Hỗ trợ trực tuyến</Typography>
                <Typography variant="caption">
                  {isConnected ? '🟢 Đang hoạt động' : '⚪ Ngoại tuyến'}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            ref={containerRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 1.5,
              bgcolor: '#f5f7fa',
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            {messages.length === 0 ? (
              <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 4 }}>
                Chưa có tin nhắn. Hãy bắt đầu trò chuyện với chúng tôi!
              </Typography>
            ) : (
              messages.map((msg, idx) => {
                const isSent = msg.senderId === user?.id;
                return (
                  <Box key={idx} sx={{ alignSelf: isSent ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    <Box sx={{
                      bgcolor: isSent ? '#007bff' : '#e4e6eb',
                      color: isSent ? 'white' : '#1c1e21',
                      px: 1.5,
                      py: 0.8,
                      borderRadius: 2,
                      fontSize: '0.85rem',
                      wordBreak: 'break-word'
                    }}>
                      {renderMessage(msg)}
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={endRef} />
          </Box>

          {/* Input */}
          <Box component="form" onSubmit={handleSend} sx={{ p: 1, display: 'flex', gap: 1, borderTop: '1px solid #e0e0e0' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Nhập tin nhắn..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
            />
            <IconButton type="submit" color="primary" disabled={!text.trim() || sending}>
              <Send fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      )}

      <Badge badgeContent={unreadCount} color="error" overlap="circular">
        <Fab
          color="primary"
          onClick={() => setOpen(!open)}
          sx={{
            bgcolor: '#007bff',
            '&:hover': { bgcolor: '#0056b3' },
            boxShadow: '0 4px 16px rgba(0,123,255,0.4)'
          }}
        >
          {open ? <Close /> : <ChatIcon />}
        </Fab>
      </Badge>

      {/* Xem ảnh lớn + tải về */}
      <Dialog open={!!lightboxUrl} onClose={() => setLightboxUrl(null)} maxWidth="md">
        <Box sx={{ position: 'relative', bgcolor: 'black' }}>
          <IconButton
            onClick={() => setLightboxUrl(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.5)' }}
          >
            <Close />
          </IconButton>
          {lightboxUrl && (
            <img src={lightboxUrl} alt="preview" style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'block' }} />
          )}
          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', bgcolor: 'white' }}>
            <IconButton color="primary" onClick={() => handleDownloadImage(lightboxUrl)}>
              <Download />
            </IconButton>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default FloatingChatWidget;
