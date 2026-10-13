import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import {
    ContentCopyRounded,
    KeyboardArrowDownRounded,
    LockRounded,
    ReplyRounded,
    SupportAgentRounded,
    TranslateRounded,
    UndoRounded
} from '@mui/icons-material';
import axios from 'axios';
import './Chat.css';
import Picker from 'emoji-picker-react';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:9981';
const MUTED_KEY = 'chat_muted_users';
const HIDDEN_MESSAGES_KEY = 'chat_hidden_messages';
const REPLY_MESSAGE_PREFIX = '__SKYHOTEL_REPLY_V1__:';

const parseReplyMessage = (message) => {
    if (typeof message !== 'string' || !message.startsWith(REPLY_MESSAGE_PREFIX)) {
        return null;
    }

    try {
        const payload = JSON.parse(message.slice(REPLY_MESSAGE_PREFIX.length));
        if (payload?.version !== 1 || typeof payload.body !== 'string' || !payload.replyTo) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
};

const getReplyBody = (message) => {
    const reply = parseReplyMessage(message);
    return reply?.body ?? String(message ?? '');
};

const getHiddenMessageIds = (userId) => {
    if (userId === undefined || userId === null) return [];

    try {
        const stored = JSON.parse(
            localStorage.getItem(`${HIDDEN_MESSAGES_KEY}_${userId}`) || '[]'
        );
        return Array.isArray(stored) ? stored.map(String) : [];
    } catch {
        return [];
    }
};

const getMutedUsers = () => {
    try {
        return JSON.parse(localStorage.getItem(MUTED_KEY) || '[]');
    } catch {
        return [];
    }
};

// Tinh trang thai online/offline + text "hoat dong X phut truoc"
const getPresenceInfo = (lastActiveAt) => {
    if (!lastActiveAt) {
        return { online: false, text: 'Chưa từng hoạt động' };
    }
    const diffMs = Date.now() - new Date(lastActiveAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin <= 2) {
        return { online: true, text: 'Đang hoạt động' };
    }
    if (diffMin < 60) {
        return { online: false, text: `Hoạt động ${diffMin} phút trước` };
    }
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
        return { online: false, text: `Hoạt động ${diffHour} giờ trước` };
    }
    const diffDay = Math.floor(diffHour / 24);
    return { online: false, text: `Hoạt động ${diffDay} ngày trước` };
};

const Chat = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        messages,
        sendMessage,
        isConnected,
        selectChatUser,
        activeChatUserId,
        isAdmin,
        loadChatHistory,
        unreadCount,
        markAsRead
    } = useChat();

    const [inputMessage, setInputMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // all | unread | groups
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [hiddenMessageIds, setHiddenMessageIds] = useState(
        () => getHiddenMessageIds(user?.id)
    );
    const [showReactionPopup, setShowReactionPopup] = useState(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState(null);
    const [presenceMap, setPresenceMap] = useState({}); // { userId: lastActiveAt }

    // Panel thong tin khach hang (ben admin)
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [infoTab, setInfoTab] = useState('info'); // info | bookings | search
    const [mutedUsers, setMutedUsers] = useState(getMutedUsers());
    const [bookingHistory, setBookingHistory] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [bookingsError, setBookingsError] = useState(false);
    const [msgSearchTerm, setMsgSearchTerm] = useState('');

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const chatMessagesRef = useRef(null);
    const isNearBottomRef = useRef(true);

    const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    useEffect(() => {
        if (isAdmin) {
            loadAllUsers();
        }
    }, [isAdmin]);

    // MOI: neu duoc dieu huong toi voi ?userId=xxx (bam "Nhan tin" tu trang Nguoi dung)
    // thi tu dong mo hoi thoai voi user do, ke ca khi chua co tin nhan nao
    useEffect(() => {
        const targetId = searchParams.get('userId');
        if (isAdmin && targetId && users.length > 0) {
            const idNum = Number(targetId);
            const exists = users.some(u => u.id === idNum);
            if (exists) {
                handleSelectUser(idNum);
            }
            setSearchParams({}, { replace: true });
        }
    }, [isAdmin, users, searchParams]);

    // Lay trang thai online/offline cho toan bo danh sach user (dinh ky 15s)
    useEffect(() => {
        if (!isAdmin || users.length === 0) return;

        const fetchPresence = async () => {
            try {
                const token = localStorage.getItem('token');
                const ids = users.map(u => u.id).join(',');
                const res = await axios.get(`${API_BASE_URL}/api/presence/bulk?ids=${ids}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPresenceMap(res.data || {});
            } catch (error) {
                console.error('Fetch presence error:', error);
            }
        };

        fetchPresence();
        const interval = setInterval(fetchPresence, 15000);
        return () => clearInterval(interval);
    }, [isAdmin, users.length]);

    const isNearBottom = () => {
        const el = chatMessagesRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    const handleScroll = () => {
        const nearBottom = isNearBottom();
        isNearBottomRef.current = nearBottom;
        setShowScrollToBottom(!nearBottom);
    };

    useEffect(() => {
        if (isNearBottomRef.current) {
            scrollToBottom();
        }
    }, [messages]);
    useEffect(() => {
        setHiddenMessageIds(getHiddenMessageIds(user?.id));
    }, [user?.id]);

    useEffect(() => {
        isNearBottomRef.current = true;
        setTimeout(scrollToBottom, 100);
        setShowInfoPanel(false);
        setInfoTab('info');
        setMsgSearchTerm('');
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
            isNearBottomRef.current = true;
            const textToSend = replyingTo
                ? formatReplyMessage(replyingTo, inputMessage.trim())
                : inputMessage.trim();

            await sendMessage(textToSend);
            setReplyingTo(null);
            setInputMessage('');
            setTimeout(scrollToBottom, 50);
        }
    };

    // Gui nhanh 1 tim (giong nut Like cua Messenger khi khong go gi)
    const handleQuickLike = async () => {
        if (!activeChatUserId) return;
        isNearBottomRef.current = true;
        await sendMessage('❤️');
        setTimeout(scrollToBottom, 50);
    };

    const handleSelectUser = async (userId) => {
        isNearBottomRef.current = true;
        selectChatUser(userId);

        // Admin mo hoi thoai -> danh dau tin nhan cua khach do la da doc
        if (isAdmin) {
            try {
                const token = localStorage.getItem('token');
                await axios.put(`${API_BASE_URL}/api/chat/read/${userId}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, hasUnread: false } : u));
            } catch (error) {
                console.error('Mark read error:', error);
            }
        }
    };

    const scrollToBottom = () => {
        isNearBottomRef.current = true;
        setShowScrollToBottom(false);

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

            isNearBottomRef.current = true;
            await sendMessage(messageText);
            setTimeout(scrollToBottom, 50);
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
            fileInputRef.current.value = '';
        }
    };

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
    const handleHideMessageForMe = (messageId) => {
        setActionMessage(null);

        if (user?.id === undefined || user?.id === null) return;

        if (!window.confirm('Xóa tin nhắn này khỏi phía bạn trên thiết bị này?')) {
            return;
        }

        const nextHiddenIds = Array.from(
            new Set([...hiddenMessageIds, String(messageId)])
        );

        try {
            localStorage.setItem(
                `${HIDDEN_MESSAGES_KEY}_${user.id}`,
                JSON.stringify(nextHiddenIds)
            );
        } catch (error) {
            console.error('Không thể lưu tin nhắn đã ẩn:', error);
        }

        setHiddenMessageIds(nextHiddenIds);
        toast.success('Đã xóa tin nhắn khỏi phía bạn');
    };

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

    const handleMouseEnter = (msgId) => setHoveredMessageId(msgId);
    const handleMouseLeave = () => setHoveredMessageId(null);

    const isOwnMessage = (msg) => {
        const senderId = msg?.senderId;
        const currentUserId = user?.id;

        return senderId !== undefined
            && senderId !== null
            && currentUserId !== undefined
            && currentUserId !== null
            && String(senderId) === String(currentUserId);
    };

    const handleMoreClick = (msg, e) => {
        e.stopPropagation();
        if (msg.isRecalled) return;

        const ownMessage = isOwnMessage(msg);
        const canRecall =
            ownMessage && new Date() - new Date(msg.createdAt) < 5 * 60 * 1000;
        const canDelete = ownMessage || isAdmin;
        const canHide = !ownMessage && !isAdmin;

        const wrapper = e.currentTarget.closest('.message-wrapper');
        const messageArea = wrapper?.closest('.chat-messages');
        const wrapperRect = wrapper?.getBoundingClientRect();
        const areaRect = messageArea?.getBoundingClientRect();

        const roomAbove = wrapperRect && areaRect
            ? wrapperRect.top - areaRect.top
            : 0;
        const roomBelow = wrapperRect && areaRect
            ? areaRect.bottom - wrapperRect.bottom
            : 0;

        // Nếu phía trên chật mà phía dưới còn chỗ, mở menu xuống dưới tin nhắn.
        const openBelow = roomAbove < 230 && roomBelow > roomAbove;

        if (actionMessage?.id === msg.id) {
            setActionMessage(null);
        } else {
            setActionMessage({
                ...msg,
                canRecall,
                canDelete,
                canHide,
                openBelow
            });
        }

        setShowReactionPopup(null);
    };
    const handleReactionClick = (msg, e) => {
        e.stopPropagation();
        if (showReactionPopup === msg.id) {
            setShowReactionPopup(null);
        } else {
            setShowReactionPopup(msg.id);
            setActionMessage(null);
        }
    };

    const getMessagePreview = (msg) => {
        const messageText = getReplyBody(msg?.message).trim();

        if (/!\[.*?\]\((.*?)\)/.test(messageText)) {
            return 'Ảnh';
        }

        const fileMatch = messageText.match(/📎\s*\[(.*?)\]\((.*?)\)/);
        if (fileMatch) {
            return `Tệp: ${fileMatch[1]}`;
        }

        return messageText.length > 100
            ? `${messageText.slice(0, 100)}…`
            : messageText;
    };

    const formatReplyMessage = (originalMessage, body) => {
        return `${REPLY_MESSAGE_PREFIX}${JSON.stringify({
            version: 1,
            replyTo: {
                id: originalMessage?.id ?? null,
                senderId: originalMessage?.senderId ?? null,
                senderName: originalMessage?.senderName || 'Tin nhắn',
                preview: getMessagePreview(originalMessage)
            },
            body: String(body || '').trim()
        })}`;
    };
    const handleReplyMessage = (msg) => {
        setReplyingTo(msg);
        setInputMessage('');
        setActionMessage(null);
        setShowReactionPopup(null);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleCopyMessage = async (msg) => {
        setActionMessage(null);

        try {
            await navigator.clipboard.writeText(String(msg?.message || ''));
            toast.success('Đã sao chép tin nhắn');
        } catch (error) {
            console.error('Copy message error:', error);
            toast.error('Không thể sao chép tin nhắn');
        }
    };

    const handleTranslateMessage = (msg) => {
        const text = String(msg?.message || '').trim();
        setActionMessage(null);

        if (!text) return;

        const translateUrl =
            `https://translate.google.com/?sl=auto&tl=vi&text=${encodeURIComponent(text)}&op=translate`;

        window.open(translateUrl, '_blank', 'noopener,noreferrer');
    };

    const renderActionPopup = (msg, isOpen) => {
        if (!isOpen || msg.isRecalled) return null;

        const canRecall =
            actionMessage?.id === msg.id && actionMessage.canRecall;
        const canDelete =
            actionMessage?.id === msg.id && actionMessage.canDelete;
        const canHide =
            actionMessage?.id === msg.id && actionMessage.canHide;
        const hasDeleteOrRecall = canRecall || canDelete || canHide;

        return (
            <div
                className={`action-popup active${actionMessage?.openBelow ? ' below' : ''}`}
                role="menu"
                aria-label="Thao tác tin nhắn"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    className="action-item"
                    role="menuitem"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleReplyMessage(msg);
                    }}
                >
                    <ReplyRounded fontSize="small" />
                    Trả lời
                </button>

                <button
                    className="action-item"
                    role="menuitem"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleCopyMessage(msg);
                    }}
                >
                    <ContentCopyRounded fontSize="small" />
                    Sao chép
                </button>

                <button
                    className="action-item"
                    role="menuitem"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleTranslateMessage(msg);
                    }}
                >
                    <TranslateRounded fontSize="small" />
                    Dịch
                </button>

                {hasDeleteOrRecall && <div className="action-divider" />}

                {canRecall && (
                    <button
                        className="action-item"
                        role="menuitem"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleRecallMessage(msg.id);
                        }}
                    >
                        <UndoRounded fontSize="small" />
                        Thu hồi
                    </button>
                )}

                {(canDelete || canHide) && (
                    <button
                        className="action-item danger"
                        role="menuitem"
                        onClick={(event) => {
                            event.stopPropagation();

                            if (canDelete) {
                                handleDeleteMessage(msg.id);
                            } else {
                                handleHideMessageForMe(msg.id);
                            }
                        }}
                    >
                        Xóa
                    </button>
                )}
            </div>
        );
    };
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

    // Goi dien - mo tel: link neu co so dien thoai
    const handleCall = () => {
        const activeUser = users.find(u => u.id === activeChatUserId);
        if (!activeUser?.phoneNumber) {
            toast.error('Khách hàng chưa có số điện thoại');
            return;
        }
        window.location.href = `tel:${activeUser.phoneNumber}`;
    };

    // Video call - chua co ha tang thuc te, thong bao trung thuc thay vi gia lap
    const handleVideoCall = () => {
        toast('Tính năng gọi video đang được phát triển', { icon: '🎥' });
    };

    const toggleMute = (userId) => {
        const next = mutedUsers.includes(userId)
            ? mutedUsers.filter(id => id !== userId)
            : [...mutedUsers, userId];
        setMutedUsers(next);
        localStorage.setItem(MUTED_KEY, JSON.stringify(next));
    };

    const fetchBookingHistory = async (userId) => {
        setBookingsLoading(true);
        setBookingsError(false);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/bookings/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBookingHistory(res.data || []);
        } catch (error) {
            console.error('Fetch booking history error:', error);
            setBookingsError(true);
        } finally {
            setBookingsLoading(false);
        }
    };

    const handleOpenInfoTab = (tab) => {
        setInfoTab(tab);
        if (tab === 'bookings' && activeChatUserId) {
            fetchBookingHistory(activeChatUserId);
        }
    };

    const renderMessageBody = (messageText) => {
        const imageMatch = messageText.match(/!\[.*\]\((.*)\)/);
        if (imageMatch) {
            const imageUrl = imageMatch[1];
            return (
                <img
                    src={imageUrl}
                    alt="image"
                    onClick={() => setLightboxUrl(imageUrl)}
                    style={{ maxWidth: '200px', borderRadius: '8px', cursor: 'pointer' }}
                />
            );
        }

        const fileMatch = messageText.match(/📎\s*\[(.*)\]\((.*)\)/);
        if (fileMatch) {
            return (
                <a href={fileMatch[2]} target="_blank" rel="noopener noreferrer">
                    📎 {fileMatch[1]}
                </a>
            );
        }

        return messageText;
    };

    const renderMessage = (msg) => {
        if (msg.isRecalled) {
            return <em style={{ color: '#999', fontStyle: 'italic' }}>Tin nhắn đã được thu hồi</em>;
        }

        const reply = parseReplyMessage(msg.message);
        if (!reply) {
            return renderMessageBody(String(msg.message || ''));
        }

        const authorName = isOwnMessage(msg) ? 'Bạn' : (msg.senderName || 'Người gửi');
        const targetSenderId = reply.replyTo.senderId;

        const repliedToSelf =
            targetSenderId != null &&
            msg.senderId != null &&
            String(targetSenderId) === String(msg.senderId);

        const repliedToCurrentUser =
            targetSenderId != null &&
            user?.id != null &&
            String(targetSenderId) === String(user.id);

        const targetName = repliedToSelf
            ? 'chính mình'
            : repliedToCurrentUser
                ? 'bạn'
                : (reply.replyTo.senderName || 'tin nhắn');

        return (
            <div className="message-reply">
                <div className="message-reply-attribution">
                    <ReplyRounded fontSize="small" />
                    <span>{authorName} đã trả lời {targetName}</span>
                </div>

                <div className="message-reply-quote">
                    <span className="message-reply-quote-sender">
                        {reply.replyTo.senderName || 'Tin nhắn'}
                    </span>
                    <span className="message-reply-quote-text">
                        {reply.replyTo.preview || 'Tin nhắn'}
                    </span>
                </div>

                <div className="message-reply-body">
                    {renderMessageBody(reply.body)}
                </div>
            </div>
        );
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

    // ===== Loc danh sach hoi thoai =====
    // Mac dinh (tab "Tat ca"/"Chua doc"): CHI hien user da tung co tin nhan qua lai
    // (giong Messenger that - khong hien nguoi chua tung nhan).
    // Ngoai le: user dang duoc chon (activeChatUserId) van hien du chua co tin nhan,
    // de admin co the go tin nhan dau tien khi bam "Nhan tin" tu trang Nguoi dung.
    const filteredUsers = users.filter(u => {
        const name = (u.fullName || u.username || '').toLowerCase();
        if (!name.includes(searchTerm.toLowerCase())) return false;

        const hasHistory = !!u.lastMessage;
        const isCurrentlyActive = u.id === activeChatUserId;
        if (!hasHistory && !isCurrentlyActive) return false;

        if (filterTab === 'unread') return u.hasUnread;
        return true; // 'all'
    });

    const activeUser = users.find(u => u.id === activeChatUserId);
    const activePresence = activeUser ? getPresenceInfo(presenceMap[activeUser.id]) : null;

    const matchedMessages = msgSearchTerm.trim()
        ? messages.filter(m => !m.isRecalled && m.message?.toLowerCase().includes(msgSearchTerm.toLowerCase()))
        : [];

    const renderLightbox = () => {
        if (!lightboxUrl) return null;
        return (
            <div
                onClick={() => setLightboxUrl(null)}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', zIndex: 3000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 16
                }}
            >
                <img
                    src={lightboxUrl}
                    alt="preview"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8 }}
                />
                <div style={{ display: 'flex', gap: 12 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDownloadImage(lightboxUrl)} className="lightbox-btn primary">
                        ⬇️ Tải về
                    </button>
                    <button onClick={() => setLightboxUrl(null)} className="lightbox-btn">
                        Đóng
                    </button>
                </div>
            </div>
        );
    };

    // Thanh nhap tin nhan kieu Messenger: pill bo tron, co icon anh + emoji,
    // ben phai la nut tim (like) khi input rong, doi thanh nut Gui khi co chu
    const renderComposer = () => (
        <>
            {replyingTo && (
                <div className="reply-composer-preview">
                    <div className="reply-composer-preview-content">
                        <span className="reply-composer-preview-title">
                            Trả lời {isOwnMessage(replyingTo) ? 'bạn' : (replyingTo.senderName || 'tin nhắn')}
                        </span>
                        <span className="reply-composer-preview-text">
                            {getMessagePreview(replyingTo)}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="reply-composer-cancel"
                        onClick={() => setReplyingTo(null)}
                        title="Hủy trả lời"
                        aria-label="Hủy trả lời"
                    >
                        ×
                    </button>
                </div>
            )}

            <form className="composer" onSubmit={handleSendMessage}>
                <label className="composer-icon-btn" title="Gửi ảnh">
                    🖼️
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                    />
                </label>

                <div className="composer-input-wrap">
                    <input
                        ref={inputRef}
                        type="text"
                        className="composer-input"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={replyingTo ? 'Nhập nội dung trả lời...' : 'Aa'}
                    />

                    <button
                        type="button"
                        className="composer-icon-btn small"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Emoji"
                    >
                        😊
                    </button>
                </div>

                {inputMessage.trim() ? (
                    <button
                        type="submit"
                        className="composer-send-btn"
                        disabled={uploading}
                        title="Gửi"
                    >
                        ➤
                    </button>
                ) : (
                    <button
                        type="button"
                        className="composer-send-btn like"
                        onClick={handleQuickLike}
                        title="Gửi ❤️"
                    >
                        ❤️
                    </button>
                )}
            </form>
        </>
    );
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
                                <div className="chat-header customer-chat-header">
                                    <div className="chat-header-info">
                                        <div className="chat-avatar support-chat-avatar">
                                            <SupportAgentRounded />
                                        </div>

                                        <div className="customer-chat-title-group">
                                            <h3>Hỗ trợ khách hàng SkyHotel</h3>
                                            <span className="customer-chat-subtitle">
                                                Tư vấn đặt phòng và hỗ trợ trong thời gian lưu trú
                                            </span>
                                        </div>
                                    </div>

                                    <div className="customer-chat-meta">
                                        <div className={`customer-chat-connection ${isConnected ? 'connected' : 'disconnected'}`}>
                                            <span className="customer-chat-connection-dot" />
                                            {isConnected ? 'Đang kết nối' : 'Đang kết nối lại'}
                                        </div>
                                        <div className="customer-chat-privacy">
                                            <LockRounded fontSize="small" />
                                            Tin nhắn riêng tư
                                        </div>
                                    </div>
                                </div>
                                <span className="chat-status">
                                    {isConnected ? '🟢 Online' : '⚪ Offline'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="chat-messages customer-chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
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
                                    <div key={index} className={`message-wrapper ${isSent ? 'sent' : 'received'}`}>
                                        <div
                                            className={`message ${isSent ? 'sent' : 'received'} ${isHovered ? 'hovered' : ''}`}
                                            onMouseEnter={() => handleMouseEnter(msg.id)}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <div className="message-content">
                                                {renderMessage(msg)}
                                                <span className="message-time">
                                                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                                {reactions && Object.keys(reactions).length > 0 && (
                                                    <div className="message-reactions">
                                                        {Object.entries(reactions).map(([emoji, count]) => (
                                                            <span key={emoji} className="reaction-badge">{emoji} {count}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {isHovered && !msg.isRecalled && (
                                                <div className="message-actions">
                                                    <button className="action-btn-icon reaction-btn-icon" onClick={(e) => handleReactionClick(msg, e)} title="Thả cảm xúc">😊</button>
                                                    <button className="action-btn-icon more-btn-icon" onClick={(e) => handleMoreClick(msg, e)} title="Thao tác khác">⋮</button>
                                                </div>
                                            )}
                                        </div>
                                        {showReaction && !msg.isRecalled && (
                                            <div className="reaction-popup active">
                                                {EMOJI_REACTIONS.map(emoji => (
                                                    <button key={emoji} className="reaction-option" onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, emoji); }}>{emoji}</button>
                                                ))}
                                            </div>
                                        )}
                                        {renderActionPopup(msg, showAction)}
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                        {showScrollToBottom && (
                            <button
                                type="button"
                                className="chat-scroll-to-bottom"
                                onClick={scrollToBottom}
                                title="Cuộn xuống tin nhắn mới nhất"
                                aria-label="Cuộn xuống tin nhắn mới nhất"
                            >
                                <KeyboardArrowDownRounded />
                            </button>
                        )}
                    </div>

                    {messages.length > 0 && !inputMessage.trim() && (
                        <div className="customer-chat-shortcuts" role="group" aria-label="Gợi ý tin nhắn">
                            <span className="customer-chat-shortcuts-label">GỢI Ý NHANH</span>
                            {['Tư vấn đặt phòng', 'Hỗ trợ thanh toán', 'Hỗ trợ lưu trú', 'Đổi hoặc hủy đặt phòng'].map((prompt) => (
                                <button
                                    type="button"
                                    key={prompt}
                                    onClick={() => {
                                        setInputMessage(prompt);
                                        inputRef.current?.focus();
                                    }}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}
                    {renderComposer()}
                    {showEmojiPicker && (
                        <div className="emoji-picker-wrapper">
                            <Picker onEmojiClick={onEmojiClick} />
                        </div>
                    )}
                </div>
                {renderLightbox()}
            </div>
        );
    }

    // ============================================================
    // ADMIN VIEW - kieu Messenger theo anh mau
    // ============================================================
    return (
        <div className="messenger-container">
            <div className="messenger-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-title">
                        <h3>Đoạn chat</h3>
                    </div>
                    <div className="search-box always-visible">
                        <input
                            type="text"
                            placeholder="Tìm kiếm khách hàng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-tabs">
                        <button className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`} onClick={() => setFilterTab('all')}>Tất cả</button>
                        <button className={`filter-tab ${filterTab === 'unread' ? 'active' : ''}`} onClick={() => setFilterTab('unread')}>Chưa đọc</button>
                        <button className={`filter-tab ${filterTab === 'groups' ? 'active' : ''}`} onClick={() => setFilterTab('groups')}>Nhóm</button>
                    </div>
                </div>

                <div className="user-list">
                    {filterTab === 'groups' ? (
                        <div className="empty-state">
                            <span>👥</span>
                            <p>Chưa có nhóm chat nào</p>
                        </div>
                    ) : loadingUsers ? (
                        <div className="loading-state"><p>Đang tải...</p></div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="empty-state">
                            <span>💬</span>
                            <p>{filterTab === 'unread' ? 'Không có tin nhắn chưa đọc' : 'Không tìm thấy khách hàng'}</p>
                        </div>
                    ) : (
                        filteredUsers.map(u => {
                            const presence = getPresenceInfo(presenceMap[u.id]);
                            return (
                                <div
                                    key={u.id}
                                    className={`user-item ${activeChatUserId === u.id ? 'active' : ''}`}
                                    onClick={() => handleSelectUser(u.id)}
                                >
                                    <div className="user-avatar-wrap">
                                        <div className="user-avatar">
                                            {u.fullName?.charAt(0) || u.username?.charAt(0) || 'U'}
                                        </div>
                                        <span className={`presence-dot ${presence.online ? 'online' : 'offline'}`} />
                                    </div>
                                    <div className="user-info">
                                        <div className={`user-name ${u.hasUnread ? 'unread' : ''}`}>
                                            {u.fullName || u.username}
                                        </div>
                                        <div className={`user-last-message ${u.hasUnread ? 'unread' : ''}`}>
                                            {u.lastMessage?.message || 'Chưa có tin nhắn'}
                                        </div>
                                    </div>
                                    {u.hasUnread && <span className="unread-dot" />}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="messenger-main">
                {activeUser ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-header-info">
                                <div className="user-avatar-wrap">
                                    <div className="chat-avatar">
                                        {activeUser.fullName?.charAt(0) || activeUser.username?.charAt(0) || 'U'}
                                    </div>
                                    <span className={`presence-dot ${activePresence.online ? 'online' : 'offline'}`} />
                                </div>
                                <div>
                                    <h3>{activeUser.fullName || activeUser.username}</h3>
                                    <span className="chat-status">{activePresence.text}</span>
                                </div>
                            </div>
                            <div className="chat-header-actions">
                                <button className="action-btn" onClick={handleCall} title="Gọi điện">📞</button>
                                <button className="action-btn" onClick={handleVideoCall} title="Video call">🎥</button>
                                <button
                                    className={`action-btn ${showInfoPanel ? 'active' : ''}`}
                                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                                    title="Xem chi tiết"
                                >
                                    ℹ️
                                </button>
                            </div>
                        </div>

                        <div className="messenger-body">
                            <div className="messenger-chat-column">
                                <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
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
                                                <div key={index} className={`message-wrapper ${isSent ? 'sent' : 'received'}`}>
                                                    <div
                                                        className={`message ${isSent ? 'sent' : 'received'} ${isHovered ? 'hovered' : ''}`}
                                                        onMouseEnter={() => handleMouseEnter(msg.id)}
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        <div className="message-content">
                                                            {renderMessage(msg)}
                                                            <span className="message-time">
                                                                {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                                {isSent && ' ✅'}
                                                            </span>
                                                            {reactions && Object.keys(reactions).length > 0 && (
                                                                <div className="message-reactions">
                                                                    {Object.entries(reactions).map(([emoji, count]) => (
                                                                        <span key={emoji} className="reaction-badge">{emoji} {count}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isHovered && !msg.isRecalled && (
                                                            <div className="message-actions">
                                                                <button className="action-btn-icon reaction-btn-icon" onClick={(e) => handleReactionClick(msg, e)} title="Thả cảm xúc">😊</button>
                                                                <button className="action-btn-icon more-btn-icon" onClick={(e) => handleMoreClick(msg, e)} title="Thao tác khác">⋮</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {showReaction && !msg.isRecalled && (
                                                        <div className="reaction-popup active">
                                                            {EMOJI_REACTIONS.map(emoji => (
                                                                <button key={emoji} className="reaction-option" onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, emoji); }}>{emoji}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {renderActionPopup(msg, showAction)}
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div ref={messagesEndRef} />
                                {showScrollToBottom && messages.length > 0 && (
                                    <button
                                        type="button"
                                        className="chat-scroll-to-bottom"
                                        onClick={scrollToBottom}
                                        title="Cuộn xuống tin nhắn mới nhất"
                                        aria-label="Cuộn xuống tin nhắn mới nhất"
                                    >
                                        <KeyboardArrowDownRounded />
                                    </button>
                                )}
                            </div>

                            {renderComposer()}
                            {showEmojiPicker && (
                                <div className="emoji-picker-wrapper">
                                    <Picker onEmojiClick={onEmojiClick} />
                                </div>
                            )}
                        </div>

                        {/* Panel thong tin khach hang */}
                        {showInfoPanel && (
                            <div className="info-panel">
                                <div className="info-panel-header">
                                    <span>Chi tiết hội thoại</span>
                                    <button onClick={() => setShowInfoPanel(false)}>✕</button>
                                </div>

                                <div className="info-panel-tabs">
                                    <button className={infoTab === 'info' ? 'active' : ''} onClick={() => handleOpenInfoTab('info')}>Thông tin</button>
                                    <button className={infoTab === 'bookings' ? 'active' : ''} onClick={() => handleOpenInfoTab('bookings')}>Lịch sử đặt phòng</button>
                                    <button className={infoTab === 'search' ? 'active' : ''} onClick={() => handleOpenInfoTab('search')}>Tìm tin nhắn</button>
                                </div>

                                <div className="info-panel-body">
                                    {infoTab === 'info' && (
                                        <div className="info-tab-content">
                                            <div className="info-avatar-large">
                                                {activeUser.fullName?.charAt(0) || activeUser.username?.charAt(0) || 'U'}
                                            </div>
                                            <h4>{activeUser.fullName || activeUser.username}</h4>
                                            <p className="info-row"><b>Username:</b> {activeUser.username}</p>
                                            <p className="info-row"><b>Email:</b> {activeUser.email || 'Chưa có'}</p>
                                            <p className="info-row"><b>SĐT:</b> {activeUser.phoneNumber || 'Chưa có'}</p>
                                            <p className="info-row"><b>Trạng thái:</b> {activePresence.text}</p>

                                            <div className="mute-toggle-row">
                                                <span>🔕 Tắt thông báo hội thoại này</span>
                                                <label className="switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={mutedUsers.includes(activeUser.id)}
                                                        onChange={() => toggleMute(activeUser.id)}
                                                    />
                                                    <span className="slider" />
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {infoTab === 'bookings' && (
                                        <div className="info-tab-content">
                                            {bookingsLoading ? (
                                                <p>Đang tải...</p>
                                            ) : bookingsError ? (
                                                <p className="info-empty">Chưa thể tải lịch sử đặt phòng (cần bổ sung API phía backend).</p>
                                            ) : bookingHistory.length === 0 ? (
                                                <p className="info-empty">Khách hàng chưa có lịch sử đặt phòng.</p>
                                            ) : (
                                                bookingHistory.map((b, idx) => (
                                                    <div className="booking-item" key={idx}>
                                                        <div><b>Phòng:</b> {b.roomNumber || b.room?.roomNumber || '—'}</div>
                                                        <div><b>Trạng thái:</b> {b.status}</div>
                                                        <div><b>Ngày:</b> {b.checkInDate} → {b.checkOutDate}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {infoTab === 'search' && (
                                        <div className="info-tab-content">
                                            <input
                                                type="text"
                                                className="msg-search-input"
                                                placeholder="Nhập từ khóa tìm trong hội thoại..."
                                                value={msgSearchTerm}
                                                onChange={(e) => setMsgSearchTerm(e.target.value)}
                                            />
                                            <div className="msg-search-results">
                                                {msgSearchTerm.trim() === '' ? (
                                                    <p className="info-empty">Nhập từ khóa để tìm tin nhắn đã gửi.</p>
                                                ) : matchedMessages.length === 0 ? (
                                                    <p className="info-empty">Không tìm thấy tin nhắn phù hợp.</p>
                                                ) : (
                                                    matchedMessages.map((m, idx) => (
                                                        <div className="msg-search-item" key={idx}>
                                                            <div className="msg-search-text">{m.message}</div>
                                                            <div className="msg-search-time">
                                                                {new Date(m.createdAt).toLocaleString('vi-VN')}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
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
            {renderLightbox()}
        </div >
    );
};

export default Chat;
