import React from 'react';
import { Box, Typography } from '@mui/material';

const Logo = ({ size = 'medium' }) => {
  const sizes = {
    small: { fontSize: '1.2rem', iconSize: 28 },
    medium: { fontSize: '1.5rem', iconSize: 36 },
    large: { fontSize: '2rem', iconSize: 48 },
  };

  const currentSize = sizes[size] || sizes.medium;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <span style={{ fontSize: currentSize.iconSize }}>☁️</span>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: '#007bff',
          fontSize: currentSize.fontSize,
          letterSpacing: '0.5px',
          '& span': {
            color: '#ff6b35',
          },
        }}
      >
        Sky<span>Hotel</span>
      </Typography>
    </Box>
  );
};

export default Logo;