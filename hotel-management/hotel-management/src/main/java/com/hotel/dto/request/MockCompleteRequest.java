package com.hotel.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MockCompleteRequest {
    private Long paymentId;
    private boolean success;
}
