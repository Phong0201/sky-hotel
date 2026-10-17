-- Tạo database
-- CREATE DATABASE hotel_db;

-- Tạo users table
CREATE TABLE IF NOT EXISTS users
(
    id           BIGSERIAL PRIMARY KEY,
    username     VARCHAR(50) UNIQUE  NOT NULL,
    email        VARCHAR(100) UNIQUE NOT NULL,
    password     VARCHAR(255)        NOT NULL,
    full_name    VARCHAR(100),
    phone_number VARCHAR(20),
    role         VARCHAR(20) DEFAULT 'GUEST',
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- Tạo rooms table
CREATE TABLE IF NOT EXISTS rooms
(
    id              BIGSERIAL PRIMARY KEY,
    room_number     VARCHAR(10) UNIQUE NOT NULL,
    room_type       VARCHAR(20)        NOT NULL,
    price_per_night DECIMAL(10, 2)     NOT NULL,
    description     TEXT,
    capacity        INTEGER,
    floor           INTEGER,
    status          VARCHAR(20) DEFAULT 'AVAILABLE',
    image_url       VARCHAR(255),
    amenities       TEXT
);

-- Tạo bookings table
CREATE TABLE IF NOT EXISTS bookings
(
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT REFERENCES users (id) ON DELETE SET NULL,
    room_id          BIGINT REFERENCES rooms (id) ON DELETE SET NULL,
    check_in_date    DATE   NOT NULL,
    check_out_date   DATE   NOT NULL,
    number_of_guests INTEGER,
    total_price      DECIMAL(10, 2),
    status           VARCHAR(20) DEFAULT 'PENDING',
    booking_date     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    special_requests TEXT
);

-- Tạo payments table
CREATE TABLE IF NOT EXISTS payments
(
    id             BIGSERIAL PRIMARY KEY,
    booking_id     BIGINT REFERENCES bookings (id) ON DELETE SET NULL,
    amount         DECIMAL(10, 2),
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    payment_date   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    completed_at   TIMESTAMP,
    transaction_id VARCHAR(100),
    notes          TEXT
);