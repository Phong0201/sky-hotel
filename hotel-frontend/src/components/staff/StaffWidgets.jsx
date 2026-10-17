import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

export const STAFF_COLORS = {
    ink: '#0e241b',
    accent: '#1f9d63',
    gold: '#d9a441',
    blue: '#2f7fd1',
    orange: '#e07f2e',
    red: '#d9534f',
    purple: '#7a5fd0',
};

/** Thẻ thống kê dùng chung cho Dashboard + các trang quản lý */
export const StatCard = ({ icon, label, value, sub, accent = '#1f9d63', trend }) => (
    <Paper
        elevation={0}
        sx={{
            p: 2.5, borderRadius: 4, height: '100%',
            border: '1px solid #e4ece7',
            background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfb 100%)',
            boxShadow: '0 6px 20px rgba(14, 36, 27, 0.05)',
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box
                sx={{
                    width: 46, height: 46, borderRadius: 3, display: 'grid', placeItems: 'center',
                    color: accent, bgcolor: `${accent}1f`,
                }}
            >
                {icon}
            </Box>
            {trend != null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: trend >= 0 ? '#1f9d63' : '#d9534f', fontSize: 13, fontWeight: 700 }}>
                    {trend >= 0 ? <ArrowUpward sx={{ fontSize: 15 }} /> : <ArrowDownward sx={{ fontSize: 15 }} />}
                    {Math.abs(trend)}%
                </Box>
            )}
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ mt: 1.5, color: '#12291f', lineHeight: 1.1 }}>
            {value}
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ color: '#43564c', mt: 0.5 }}>
            {label}
        </Typography>
        {sub && (
            <Typography variant="caption" sx={{ color: '#84958b' }}>{sub}</Typography>
        )}
    </Paper>
);

/** Tiêu đề trang quản lý: tiêu đề + mô tả + nút hành động bên phải */
export const PageHeader = ({ title, subtitle, actions }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#10231b', letterSpacing: '-0.5px' }}>
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="body2" sx={{ color: '#71857b', mt: 0.5 }}>{subtitle}</Typography>
            )}
        </Box>
        {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
    </Box>
);

/** Khối nội dung có tiêu đề (card trắng bo góc) */
export const SectionCard = ({ title, subtitle, action, children, sx }) => (
    <Paper
        elevation={0}
        sx={{
            p: 2.5, borderRadius: 4, border: '1px solid #e4ece7',
            boxShadow: '0 6px 20px rgba(14, 36, 27, 0.05)', height: '100%', ...sx,
        }}
    >
        {(title || action) && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                    {title && <Typography variant="h6" fontWeight={700} sx={{ color: '#16302a' }}>{title}</Typography>}
                    {subtitle && <Typography variant="caption" sx={{ color: '#84958b' }}>{subtitle}</Typography>}
                </Box>
                {action}
            </Box>
        )}
        {children}
    </Paper>
);

/**
 * Biểu đồ cột doanh thu thuần CSS (không cần thư viện) — data: [{label, value, display}]
 * (PHẦN 7) Bấm vào 1 cột -> onSelect(item); cột đang chọn (selectedLabel) được tô đậm.
 */
export const RevenueBars = ({ data, color = '#1f9d63', onSelect, selectedLabel }) => {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 1, md: 2 }, height: 190, px: 0.5 }}>
                {data.map((d) => {
                    const selected = selectedLabel && d.label === selectedLabel;
                    return (
                        <Box
                            key={d.label}
                            onClick={onSelect ? () => onSelect(d) : undefined}
                            title={onSelect ? `${d.label}: ${d.display} — bấm để xem chi tiết` : `${d.label}: ${d.display}`}
                            sx={{
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                                height: '100%', justifyContent: 'flex-end',
                                cursor: onSelect ? 'pointer' : 'default',
                                borderRadius: 2, px: 0.5, pt: 1,
                                bgcolor: selected ? '#eef6f1' : 'transparent',
                                '&:hover': onSelect ? { bgcolor: '#f4f9f6' } : {},
                            }}
                        >
                            <Typography variant="caption" fontWeight={800} sx={{ color: selected ? '#0e5c39' : '#43564c' }}>
                                {d.short || ''}
                            </Typography>
                            <Box
                                sx={{
                                    width: 'min(44px, 70%)',
                                    height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1.5)}%`,
                                    borderRadius: '10px 10px 4px 4px',
                                    background: selected
                                        ? 'linear-gradient(180deg, #0b3d2e, #14532d)'
                                        : `linear-gradient(180deg, ${color}, ${color}b3)`,
                                    boxShadow: selected ? '0 0 0 3px #9fd4b4, 0 8px 16px rgba(14,60,40,.25)' : 'none',
                                    transition: 'all .25s ease',
                                    '&:hover': { filter: 'brightness(1.12)' },
                                }}
                            />
                            <Typography variant="caption" fontWeight={selected ? 800 : 400} sx={{ color: selected ? '#0e5c39' : '#84958b', whiteSpace: 'nowrap' }}>{d.label}</Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

/**
 * Biểu đồ tròn trạng thái (SVG) — segments: [{label, value, color, code?}]
 * (PHẦN 8) Trỏ vào 1 miếng: miếng phình ra + phát sáng. Ấn vào: onSelect(segment).
 * Miếng đang chọn truyền qua selectedLabel (so với code, không có code thì so label).
 */
export const StatusDonut = ({ segments, centerLabel, centerValue, onSelect, selectedLabel }) => {
    const [hovered, setHovered] = React.useState(null);
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const R = 70;
    const C = 2 * Math.PI * R;
    let acc = 0;
    const arcs = segments.map((seg) => {
        const frac = seg.value / total;
        const item = { seg, dash: Math.max(frac * C - 3, 0), offset: -acc * C, frac };
        acc += frac;
        return item;
    });
    const keyOf = (seg) => seg.code ?? seg.label;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ position: 'relative', width: 176, height: 176, flexShrink: 0 }}>
                <svg width="176" height="176" viewBox="0 0 176 176">
                    <circle cx="88" cy="88" r={R} fill="none" stroke="#eef3f0" strokeWidth="26" />
                    {arcs.map(({ seg, dash, offset }) => {
                        const active = hovered === keyOf(seg) || selectedLabel === keyOf(seg);
                        return (
                            <circle
                                key={keyOf(seg)}
                                cx="88" cy="88" r={R} fill="none"
                                stroke={seg.color}
                                strokeWidth={active ? 34 : 26}
                                strokeDasharray={`${dash} ${C - dash}`}
                                strokeDashoffset={offset}
                                transform="rotate(-90 88 88)"
                                onMouseEnter={() => setHovered(keyOf(seg))}
                                onMouseLeave={() => setHovered(null)}
                                onClick={onSelect ? () => onSelect(seg) : undefined}
                                style={{
                                    cursor: onSelect ? 'pointer' : 'default',
                                    transition: 'stroke-width .18s ease, filter .18s ease',
                                    filter: active ? `drop-shadow(0 3px 8px ${seg.color}66)` : 'none',
                                }}
                            >
                                <title>{`${seg.label}: ${seg.value}`}</title>
                            </circle>
                        );
                    })}
                </svg>
                <Box sx={{
                    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none',
                }}>
                    <Box>
                        <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1 }}>{centerValue}</Typography>
                        <Typography variant="caption" sx={{ color: '#84958b' }}>{centerLabel}</Typography>
                    </Box>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {segments.map((seg) => {
                    const active = hovered === keyOf(seg) || selectedLabel === keyOf(seg);
                    return (
                        <Box
                            key={keyOf(seg)}
                            onMouseEnter={() => setHovered(keyOf(seg))}
                            onMouseLeave={() => setHovered(null)}
                            onClick={onSelect ? () => onSelect(seg) : undefined}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.4, borderRadius: 2,
                                cursor: onSelect ? 'pointer' : 'default',
                                bgcolor: active ? '#eef6f1' : 'transparent',
                                transition: 'all .15s ease',
                            }}
                        >
                            <Box sx={{ width: active ? 13 : 10, height: active ? 13 : 10, borderRadius: '3px', bgcolor: seg.color, transition: 'all .15s ease' }} />
                            <Typography variant="body2" fontWeight={active ? 700 : 400} sx={{ color: '#43564c' }}>{seg.label}</Typography>
                            <Typography variant="body2" fontWeight={700}>{seg.value}</Typography>
                            <Typography variant="caption" sx={{ color: '#84958b' }}>{total ? `${Math.round((seg.value / total) * 100)}%` : ''}</Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export const QuickActionButton = ({ icon, label, onClick, color = '#1f9d63' }) => (
    <Button
        variant="outlined"
        startIcon={icon}
        onClick={onClick}
        sx={{
            borderRadius: 3, textTransform: 'none', fontWeight: 600,
            borderColor: '#d7e2dc', color: '#24473a', bgcolor: '#fff',
            '&:hover': { borderColor: color, bgcolor: `${color}0d` },
        }}
    >
        {label}
    </Button>
);