package com.hotel.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentPayRequest {
    // Ghi chú của khách cho giao dịch (tùy chọn)
    private String notes;
}
