import React, { useRef } from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { ChevronLeft, ChevronRight, ArrowForward } from '@mui/icons-material';

// Thứ tự hiển thị các nhóm loại phòng (loại lạ không có trong danh sách sẽ xếp cuối)
export const ROOM_TYPE_ORDER = ['SINGLE', 'DOUBLE', 'TWIN', 'SUITE', 'FAMILY', 'DELUXE', 'VIP', 'STANDARD', 'EXECUTIVE'];

// Gom danh sách phòng thành các nhóm theo loại phòng
export const groupRoomsByType = (rooms) => {
    const groups = new Map();
    (rooms || []).forEach((room) => {
        const type = room.roomType || 'OTHER';
        if (!groups.has(type)) groups.set(type, []);
        groups.get(type).push(room);
    });
    const rank = (type) => {
        const i = ROOM_TYPE_ORDER.indexOf(type);
        return i === -1 ? 99 : i;
    };
    return [...groups.entries()]
        .sort(([a], [b]) => rank(a) - rank(b))
        .map(([type, list]) => ({ type, rooms: list }));
};

// Gom nhóm hiển thị: phòng có groupName (admin chọn trong Cài đặt) xếp theo tên nhóm,
// phòng chưa chọn nhóm xếp theo loại phòng. groupOrder = thứ tự nhóm trong Cài đặt.
export const groupRoomsForDisplay = (rooms, groupOrder = []) => {
    const named = new Map();
    const byType = new Map();
    (rooms || []).forEach((room) => {
        const g = (room.groupName || '').trim();
        if (g) {
            if (!named.has(g)) named.set(g, []);
            named.get(g).push(room);
        } else {
            const type = room.roomType || 'OTHER';
            if (!byType.has(type)) byType.set(type, []);
            byType.get(type).push(room);
        }
    });
    const nameRank = (name) => {
        const i = groupOrder.indexOf(name);
        return i === -1 ? 999 : i;
    };
    const typeRank = (type) => {
        const i = ROOM_TYPE_ORDER.indexOf(type);
        return i === -1 ? 99 : i;
    };
    const namedArr = [...named.entries()]
        .sort(([a], [b]) => nameRank(a) - nameRank(b))
        .map(([name, list]) => ({ key: `g:${name}`, groupName: name, type: null, rooms: list }));
    const typeArr = [...byType.entries()]
        .sort(([a], [b]) => typeRank(a) - typeRank(b))
        .map(([type, list]) => ({ key: `t:${type}`, groupName: null, type, rooms: list }));
    return [...namedArr, ...typeArr];
};

/**
 * Một nhóm phòng hiển thị dạng băng chuyền lướt ngang:
 * - Tiêu đề nhóm + nút "Xem tất cả" (nếu trang cha truyền onViewAll)
 * - 2 nút mũi tên tròn nằm 2 mép trái/phải để trượt qua lại (kéo/vuốt cũng được)
 * - Nội dung từng thẻ phòng do trang cha truyền vào qua renderRoom
 *   nên giữ nguyên 100% giao diện/logic thẻ phòng cũ.
 */
const RoomTypeCarousel = ({ title, countLabel, rooms, renderRoom, onViewAll, viewAllLabel = 'Xem tất cả', layout = 'carousel' }) => {
    const scrollerRef = useRef(null);

    if (!rooms || rooms.length === 0) return null;

    const scrollByPage = (direction) => {
        const el = scrollerRef.current;
        if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
    };

    const sideArrowSx = (side) => ({
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [side]: { md: 6, lg: 10 },
        zIndex: 3,
        display: { xs: 'none', md: 'inline-flex' },
        width: 38,
        height: 38,
        bgcolor: '#fff',
        color: '#174c40',
        border: '1px solid #e2eae4',
        boxShadow: '0 6px 18px rgba(23,64,48,0.16)',
        '&:hover': { bgcolor: '#eef5f0' },
    });

    return (
        <Box sx={{ mb: 4.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="h6" fontWeight={700}>
                    {title}
                    {countLabel && (
                        <Typography component="span" variant="body2" color="textSecondary" sx={{ ml: 1, fontWeight: 500 }}>
                            {countLabel}
                        </Typography>
                    )}
                </Typography>
                {layout === 'carousel' && onViewAll && (
                    <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                        onClick={onViewAll}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            color: '#174c40',
                            textDecoration: 'underline',
                            textUnderlineOffset: 3,
                            '&:hover': { bgcolor: 'transparent', color: '#0f3d33' },
                        }}
                    >
                        {viewAllLabel}
                    </Button>
                )}
            </Box>

            {layout === 'grid' ? (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
                        gap: 2.5,
                        alignItems: 'stretch',
                    }}
                >
                    {rooms.map((room) => (
                        <Box key={room.id} sx={{ display: 'flex' }}>
                            {renderRoom(room)}
                        </Box>
                    ))}
                </Box>
            ) : (
            <Box sx={{ position: 'relative' }}>
                {rooms.length > 2 && (
                    <>
                        <IconButton aria-label="prev" onClick={() => scrollByPage(-1)} sx={sideArrowSx('left')}>
                            <ChevronLeft />
                        </IconButton>
                        <IconButton aria-label="next" onClick={() => scrollByPage(1)} sx={sideArrowSx('right')}>
                            <ChevronRight />
                        </IconButton>
                    </>
                )}

                <Box
                    ref={scrollerRef}
                    sx={{
                        display: 'flex',
                        gap: 2.5,
                        overflowX: 'auto',
                        px: 0.25,
                        pb: 1.5,
                        scrollSnapType: 'x proximity',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}
                >
                    {rooms.map((room) => (
                        <Box
                            key={room.id}
                            sx={{
                                flex: { xs: '0 0 86%', sm: '0 0 47%', lg: '0 0 calc((100% - 60px) / 4)' },
                                scrollSnapAlign: 'start',
                                display: 'flex',
                            }}
                        >
                            {renderRoom(room)}
                        </Box>
                    ))}
                </Box>
            </Box>
            )}
        </Box>
    );
};

export default RoomTypeCarousel;