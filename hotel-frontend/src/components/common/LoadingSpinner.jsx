import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const LoadingSpinner = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress size={60} />
  </Box>
);

export default LoadingSpinner;