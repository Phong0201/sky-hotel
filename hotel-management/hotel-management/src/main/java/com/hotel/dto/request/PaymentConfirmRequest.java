package com.hotel.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentConfirmRequest {
    // Mã giao dịch ngân hàng / biên lai (nếu có)
    private String transactionId;
    private String notes;
}
