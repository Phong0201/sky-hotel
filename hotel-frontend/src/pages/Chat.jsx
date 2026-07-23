import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Chat.css';
import Picker from 'emoji-picker-react';
import toast from 'react-hot-toast';

const Chat = () => {
    const { user } = useAuth();
    const { 
        messages, 
        sendMessage, 
        isConnected, 
        selectChatUser, 
        activeChatUserId,
        isAdmin,
        loadChatHistory
    } = useChat();
    
    const [inputMessage, setInputMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [showReactionPopup, setShowReactionPopup] = useState(null);
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const chatMessagesRef = useRef(null);
    const isUserScrollingRef = useRef(false);
    const API_BASE_URL = 'http://localhost:9981';

    const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    useEffect(() => {
        if (isAdmin) {
            loadAllUsers();
        }
    }, [isAdmin]);

    // Bắt sự kiện scroll của user
    useEffect(() => {
        const chatContainer = chatMessagesRef.current;
        if (!chatContainer) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = chatContainer;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
            
            // Nếu user kéo lên thì đánh dấu đang scroll
            if (!isAtBottom) {
                isUserScrollingRef.current = true;
            } else {
                isUserScrollingRef.current = false;
            }
        };

        chatContainer.addEventListener('scroll', handleScroll);
        return () => chatContainer.removeEventListener('scroll', handleScroll);
    }, []);

    // Chỉ scroll khi messages thay đổi và user không đang kéo lên
    useEffect(() => {
        if (!isUserScrollingRef.current && shouldScrollToBottom) {
            scrollToBottom();
        }
    }, [messages]);

    // Reset scroll state khi chuyển user
    useEffect(() => {
        isUserScrollingRef.current = false;
        setShouldScrollToBottom(true);
        setTimeout(scrollToBottom, 100);
    }, [activeChatUserId]);

    useEffect(() => {
        const handleClickOutside = () => {
            setActionMessage(null);
            setShowReactionPopup(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/chat/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data || []);
            if (res.data.length > 0 && !activeChatUserId) {
                selectChatUser(res.data[0].id);
            }
        } catch (error) {
            console.error('Load users error:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (inputMessage.trim() && activeChatUserId) {
            // Đánh dấu sẽ scroll sau khi gửi
            isUserScrollingRef.current = false;
            setShouldScrollToBottom(true);
            await sendMessage(inputMessage);
            setInputMessage('');
            // Scroll ngay sau khi gửi
            setTimeout(scrollToBottom, 50);
        }
    };

    const handleSelectUser = (userId) => {
        isUserScrollingRef.current = false;
        setShouldScrollToBottom(true);
        selectChatUser(userId);
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const onEmojiClick = (emojiObject) => {
        setInputMessage(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);

            const res = await axios.post(`${API_BASE_URL}/api/upload/chat`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const fileUrl = res.data.url || res.data.fileUrl;
            const messageText = file.type.startsWith('image/') 
                ? `![image](${fileUrl})` 
                : `📎 [${file.name}](${fileUrl})`;
            
            isUserScrollingRef.current = false;
            setShouldScrollToBottom(true);
            await sendMessage(messageText);
            setTimeout(scrollToBottom, 50);
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
            fileInputRef.current.value = '';
        }
    };

    // 👉 THU HỒI
    const handleRecallMessage = async (messageId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/api/chat/recall/${messageId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadChatHistory();
            setActionMessage(null);
            toast.success('Đã thu hồi tin nhắn');
        } catch (error) {
            console.error('Recall error:', error);
            toast.error('Không thể thu hồi tin nhắn này');
        }
    };

    // 👉 XÓA
    const handleDeleteMessage = async (messageId) => {
        setActionMessage(null);
        if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/api/chat/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadChatHistory();
            toast.success('Đã xóa tin nhắn');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Không thể xóa tin nhắn này');
        }
    };

    // 👉 THẢ CẢM XÚC
    const handleAddReaction = async (messageId, reaction) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/chat/reaction/${messageId}?reaction=${reaction}&userId=${user?.id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadChatHistory();
            setShowReactionPopup(null);
        } catch (error) {
            console.error('Reaction error:', error);
        }
    };

    const handleMouseEnter = (msgId) => {
        setHoveredMessageId(msgId);
    };

    const handleMouseLeave = () => {
        setHoveredMessageId(null);
    };

    // 👉 CLICK VÀO 3 CHẤM
    const handleMoreClick = (msg, e) => {
        e.stopPropagation();
        
        if (msg.isRecalled) return;
        
        const canRecall = msg.senderId === user?.id && 
            new Date() - new Date(msg.createdAt) < 5 * 60 * 1000;
        
        const canDelete = msg.senderId === user?.id || isAdmin;
        
        if (!canRecall && !canDelete) return;
        
        if (actionMessage?.id === msg.id) {
            setActionMessage(null);
        } else {
            setActionMessage({
                ...msg,
                canRecall,
                canDelete
            });
        }
        setShowReactionPopup(null);
    };

    // 👉 CLICK VÀO ICON MẶT CƯỜI
    const handleReactionClick = (msg, e) => {
        e.stopPropagation();
        if (showReactionPopup === msg.id) {
            setShowReactionPopup(null);
        } else {
            setShowReactionPopup(msg.id);
            setActionMessage(null);
        }
    };

    const renderMessage = (msg) => {
        if (msg.isRecalled) {
            return <em style={{ color: '#999', fontStyle: 'italic' }}>Tin nhắn đã được thu hồi</em>;
        }

        const imageMatch = msg.message.match(/!\[.*\]\((.*)\)/);
        if (imageMatch) {
            return <img src={imageMatch[1]} alt="image" style={{ maxWidth: '200px', borderRadius: '8px' }} />;
        }
        
        const fileMatch = msg.message.match(/📎\s*\[(.*)\]\((.*)\)/);
        if (fileMatch) {
            return (
                <a href={fileMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                    📎 {fileMatch[1]}
                </a>
            );
        }
        
        return msg.message;
    };

    const getMessageReactions = (msg) => {
        if (!msg.reactions || msg.reactions.length === 0) return null;
        
        const reactionMap = {};
        msg.reactions.forEach(r => {
            const parts = r.split(':');
            if (parts.length === 2) {
                const emoji = parts[1];
                if (!reactionMap[emoji]) reactionMap[emoji] = 0;
                reactionMap[emoji]++;
            }
        });
        
        return reactionMap;
    };

    const filteredUsers = users.filter(u => {
        const name = (u.fullName || u.username || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    const activeUser = users.find(u => u.id === activeChatUserId);

    // ============================================================
    // USER VIEW
    // ============================================================
    if (!isAdmin) {
        return (
            <div className="messenger-container user-chat-view">
                <div className="messenger-main" style={{ width: '100%' }}>
                    <div className="chat-header">
                        <div className="chat-header-info">
                            <div className="chat-avatar" style={{ background: '#e53e3e' }}>A</div>
                            <div>
                                <h3>Admin Support</h3>
                                <span className="chat-status">
                                    {isConnected ? '🟢 Online' : '⚪ Offline'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div 
                        className="chat-messages" 
                        ref={chatMessagesRef}
                    >
                        {messages.length === 0 ? (
                            <div className="empty-chat">
                                <div className="empty-icon">💬</div>
                                <p>No messages yet</p>
                                <span>Start chatting with Admin!</span>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isSent = msg.senderId === user?.id;
                                const reactions = getMessageReactions(msg);
                                const isHovered = hoveredMessageId === msg.id;
                                const showReaction = showReactionPopup === msg.id;
                                const showAction = actionMessage?.id === msg.id;
                                
                                return (
                                    <div 
                                        key={index} 
                                        className={`message-wrapper ${isSent ? 'sent' : 'received'}`}
                                    >
                                        <div 
                                            className={`message ${isSent ? 'sent' : 'received'} ${isHovered ? 'hovered' : ''}`}
                                            onMouseEnter={() => handleMouseEnter(msg.id)}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <div className="message-content">
                                                {renderMessage(msg)}
                                                <span className="message-time">
                                                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                
                                                {reactions && Object.keys(reactions).length > 0 && (
                                                    <div className="message-reactions">
                                                        {Object.entries(reactions).map(([emoji, count]) => (
                                                            <span key={emoji} className="reaction-badge">
                                                                {emoji} {count}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 👉 HOVER ACTION BUTTONS */}
                                            {isHovered && !msg.isRecalled && (
                                                <div className="message-actions">
                                                    <button 
                                                        className="action-btn-icon reaction-btn-icon"
                                                        onClick={(e) => handleReactionClick(msg, e)}
                                                        title="Thả cảm xúc"
                                                    >
                                                        😊
                                                    </button>
                                                    <button 
                                                        className="action-btn-icon more-btn-icon"
                                                        onClick={(e) => handleMoreClick(msg, e)}
                                                        title="Thao tác khác"
                                                    >
                                                        ⋮
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* 👉 REACTION POPUP */}
                                        {showReaction && !msg.isRecalled && (
                                            <div className="reaction-popup active">
                                                {EMOJI_REACTIONS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        className="reaction-option"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAddReaction(msg.id, emoji);
                                                        }}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* 👉 ACTION POPUP (3 CHẤM) */}
                                        {showAction && !msg.isRecalled && (
                                            <div className="action-popup active">
                                                {actionMessage?.canRecall && (
                                                    <button 
                                                        className="action-item"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRecallMessage(msg.id);
                                                        }}
                                                    >
                                                        <span className="action-icon">🔄</span>
                                                        Thu hồi
                                                    </button>
                                                )}
                                                {actionMessage?.canDelete && (
                                                    <button 
                                                        className="action-item danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteMessage(msg.id);
                                                        }}
                                                    >
                                                        <span className="action-icon">🗑️</span>
                                                        Xóa
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input" onSubmit={handleSendMessage}>
                        <button type="button" className="input-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                            😊
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type a message..."
                        />
                        <label className="input-btn file-btn">
                            📎
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                style={{ display: 'none' }}
                            />
                        </label>
                        <button type="submit" className="send-btn" disabled={!inputMessage.trim() || uploading}>
                            {uploading ? '...' : 'Send'}
                        </button>
                    </form>
                    
                    {showEmojiPicker && (
                        <div className="emoji-picker-wrapper">
                            <Picker onEmojiClick={onEmojiClick} />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============================================================
    // ADMIN VIEW
    // ============================================================
    return (
        <div className="messenger-container">
            <div className="messenger-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-title">
                        <h3>💬 Chats</h3>
                        <button className="search-toggle" onClick={() => setShowSearch(!showSearch)}>🔍</button>
                    </div>
                    {showSearch && (
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <div className="user-list">
                    {loadingUsers ? (
                        <div className="loading-state"><p>Loading...</p></div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="empty-state">
                            <span>💬</span>
                            <p>No chats yet</p>
                        </div>
                    ) : (
                        filteredUsers.map(u => (
                            <div 
                                key={u.id} 
                                className={`user-item ${activeChatUserId === u.id ? 'active' : ''}`} 
                                onClick={() => handleSelectUser(u.id)}
                            >
                                <div className="user-avatar">
                                    {u.fullName?.charAt(0) || u.username?.charAt(0) || 'U'}
                                </div>
                                <div className="user-info">
                                    <div className="user-name">{u.fullName || u.username}</div>
                                    <div className="user-last-message">
                                        {u.lastMessage?.message || 'No messages yet'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="messenger-main">
                {activeUser ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-header-info">
                                <div className="chat-avatar">
                                    {activeUser.fullName?.charAt(0) || activeUser.username?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h3>{activeUser.fullName || activeUser.username}</h3>
                                    <span className="chat-status">
                                        {isConnected ? '🟢 Online' : '⚪ Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div 
                            className="chat-messages" 
                            ref={chatMessagesRef}
                        >
                            {messages.length === 0 ? (
                                <div className="empty-chat">
                                    <div className="empty-icon">💬</div>
                                    <p>No messages yet</p>
                                    <span>Start chatting with {activeUser.fullName || activeUser.username}!</span>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isSent = msg.senderId === user?.id;
                                    const reactions = getMessageReactions(msg);
                                    const isHovered = hoveredMessageId === msg.id;
                                    const showReaction = showReactionPopup === msg.id;
                                    const showAction = actionMessage?.id === msg.id;
                                    
                                    return (
                                        <div 
                                            key={index} 
                                            className={`message-wrapper ${isSent ? 'sent' : 'received'}`}
                                        >
                                            <div 
                                                className={`message ${isSent ? 'sent' : 'received'} ${isHovered ? 'hovered' : ''}`}
                                                onMouseEnter={() => handleMouseEnter(msg.id)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                <div className="message-content">
                                                    {renderMessage(msg)}
                                                    <span className="message-time">
                                                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                        {isSent && ' ✅'}
                                                    </span>
                                                    
                                                    {reactions && Object.keys(reactions).length > 0 && (
                                                        <div className="message-reactions">
                                                            {Object.entries(reactions).map(([emoji, count]) => (
                                                                <span key={emoji} className="reaction-badge">
                                                                    {emoji} {count}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 👉 HOVER ACTION BUTTONS */}
                                                {isHovered && !msg.isRecalled && (
                                                    <div className="message-actions">
                                                        <button 
                                                            className="action-btn-icon reaction-btn-icon"
                                                            onClick={(e) => handleReactionClick(msg, e)}
                                                            title="Thả cảm xúc"
                                                        >
                                                            😊
                                                        </button>
                                                        <button 
                                                            className="action-btn-icon more-btn-icon"
                                                            onClick={(e) => handleMoreClick(msg, e)}
                                                            title="Thao tác khác"
                                                        >
                                                            ⋮
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 👉 REACTION POPUP */}
                                            {showReaction && !msg.isRecalled && (
                                                <div className="reaction-popup active">
                                                    {EMOJI_REACTIONS.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            className="reaction-option"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddReaction(msg.id, emoji);
                                                            }}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 👉 ACTION POPUP (3 CHẤM) */}
                                            {showAction && !msg.isRecalled && (
                                                <div className="action-popup active">
                                                    {actionMessage?.canRecall && (
                                                        <button 
                                                            className="action-item"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRecallMessage(msg.id);
                                                            }}
                                                        >
                                                            <span className="action-icon">🔄</span>
                                                            Thu hồi
                                                        </button>
                                                    )}
                                                    {actionMessage?.canDelete && (
                                                        <button 
                                                            className="action-item danger"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteMessage(msg.id);
                                                            }}
                                                        >
                                                            <span className="action-icon">🗑️</span>
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-input" onSubmit={handleSendMessage}>
                            <button type="button" className="input-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                😊
                            </button>
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type a message..."
                            />
                            <label className="input-btn file-btn">
                                📎
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <button type="submit" className="send-btn" disabled={!inputMessage.trim() || uploading}>
                                {uploading ? '...' : 'Send'}
                            </button>
                        </form>
                        
                        {showEmojiPicker && (
                            <div className="emoji-picker-wrapper">
                                <Picker onEmojiClick={onEmojiClick} />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <div className="no-chat-icon">💬</div>
                        <h3>Select a chat</h3>
                        <p>Choose a user from the left</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;