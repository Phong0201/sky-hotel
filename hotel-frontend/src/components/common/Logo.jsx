import React from 'react';
import { Box, Typography } from '@mui/material';

const Logo = ({ size = 'medium' }) => {
  const sizes = {
    small: { mark: 32, wordmark: '1.12rem' },
    medium: { mark: 44, wordmark: '1.55rem' },
    large: { mark: 58, wordmark: '2rem' },
  };

  const currentSize = sizes[size] || sizes.medium;

  return (
    <Box
      role="img"
      aria-label="SkyHotel"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexShrink: 0 }}
    >
      <svg
        width={currentSize.mark}
        height={currentSize.mark}
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="skyhotel-mark-sky"
            x1="8"
            y1="6"
            x2="39"
            y2="41"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#9be1ef" />
            <stop offset="1" stopColor="#438ca5" />
          </linearGradient>
        </defs>

        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="15"
          fill="#f8fbf9"
          stroke="#dce8e1"
        />

        {/* Khung trời */}
        <path
          d="M8.5 38V21.5a15.5 15.5 0 0 1 31 0V38h-31Z"
          fill="url(#skyhotel-mark-sky)"
        />

        {/* Mặt trời và mây */}
        <circle cx="33.3" cy="16.7" r="4.2" fill="#f3bd67" />
        <path
          d="M14.1 24.4a4.2 4.2 0 0 1-.1-8.4 6.5 6.5 0 0 1 12.4-1.1 4.5 4.5 0 1 1 1.5 9.5H14.1Z"
          fill="#fff"
        />

        {/* Đường chân trời và mái khách sạn */}
        <path
          d="M8.5 30.5c5.5-4 9.5 2.7 15.3-1.1 5.6-3.7 9.8.8 15.7-1.6V38h-31v-7.5Z"
          fill="#65b3a4"
        />
        <path d="m14 36 10-6.7L34 36v2H14v-2Z" fill="#fff" />
        <path
          d="m13 36 11-7.5L35 36"
          fill="none"
          stroke="#174c40"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M17 35.7h14V42H17z" fill="#fff" />
        <path d="M22 38h4v4h-4z" fill="#d29a55" />
      </svg>

      <Typography
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'baseline',
          fontSize: currentSize.wordmark,
          fontWeight: 800,
          letterSpacing: '-0.055em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          color: '#174c40',
          '& .brand-accent': { color: '#b88442', fontWeight: 700 },
        }}
      >
        Sky<span className="brand-accent">Hotel</span>
      </Typography>
    </Box>
  );
};

export default Logo;