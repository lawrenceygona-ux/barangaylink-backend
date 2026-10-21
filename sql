-- 1. Schema & Tables (01_schema.sql) --

-- Ensure extensions and schema exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS barangay;

-- Set current schema
SET search_path TO barangay, public;

-- ENUM Types
CREATE TYPE user_role AS ENUM ('Administrator', 'Barangay Staff', 'Resident');
CREATE TYPE request_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Ready for Release', 'Released');
CREATE TYPE civil_status AS ENUM ('Single', 'Married', 'Widowed', 'Divorced', 'Separated');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Resident',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Residents Table
CREATE TABLE residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(20),
    birthdate DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    civil_status civil_status DEFAULT 'Single',
    purok_zone VARCHAR(100) NOT NULL,
    address_line TEXT NOT NULL,
    contact_number VARCHAR(20),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Households Table
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_number VARCHAR(50) UNIQUE NOT NULL,
    head_resident_id UUID UNIQUE REFERENCES residents(id) ON DELETE RESTRICT,
    purok_zone VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Household Members Table
CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    resident_id UUID UNIQUE NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    relationship_to_head VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Document Requests Table
CREATE TABLE document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(30) UNIQUE NOT NULL,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    document_type VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    status request_status DEFAULT 'Pending',
    remarks TEXT,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Announcements Table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit Log Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    performed_by VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_residents_name ON residents(last_name, first_name);
CREATE INDEX idx_residents_purok ON residents(purok_zone);
CREATE INDEX idx_doc_requests_status ON document_requests(status);
CREATE INDEX idx_doc_requests_tracking ON document_requests(tracking_number);


-- 2. Triggers (02_triggers.sql) --

SET search_path TO barangay, public;

-- Timestamp update trigger function
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_residents_updated_at BEFORE UPDATE ON residents FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_doc_requests_updated_at BEFORE UPDATE ON document_requests FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Audit log trigger function
CREATE OR REPLACE FUNCTION fn_audit_document_requests()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status <> NEW.status) THEN
            INSERT INTO audit_logs (table_name, record_id, action, performed_by, old_data, new_data)
            VALUES (
                'document_requests',
                NEW.id,
                'STATUS_CHANGE',
                CURRENT_USER,
                jsonb_build_object('old_status', OLD.status, 'remarks', OLD.remarks),
                jsonb_build_object('new_status', NEW.status, 'processed_by', NEW.processed_by, 'remarks', NEW.remarks)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_document_status
AFTER UPDATE ON document_requests
FOR EACH ROW
EXECUTE FUNCTION fn_audit_document_requests();

-- 3. Functions & Stored Procedures (03_functions_procedures.sql) --
SET search_path TO barangay, public;

-- 1. Calculate Age
CREATE OR REPLACE FUNCTION fn_calculate_age(p_birthdate DATE)
RETURNS INT AS $$
BEGIN
    RETURN DATE_PART('year', AGE(CURRENT_DATE, p_birthdate))::INT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Generate Tracking Number
CREATE OR REPLACE FUNCTION fn_generate_tracking_number()
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR(15);
    v_seq INT;
    v_tracking VARCHAR(30);
BEGIN
    v_prefix := 'BRGY-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-';
    SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq 
    FROM document_requests 
    WHERE tracking_number LIKE v_prefix || '%';
    
    v_tracking := v_prefix || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_tracking;
END;
$$ LANGUAGE plpgsql;

-- 3. Procedure: Register Resident + User atomically
CREATE OR REPLACE PROCEDURE sp_register_resident_user(
    p_email VARCHAR,
    p_password_hash VARCHAR,
    p_first_name VARCHAR,
    p_middle_name VARCHAR,
    p_last_name VARCHAR,
    p_birthdate DATE,
    p_gender VARCHAR,
    p_purok_zone VARCHAR,
    p_address_line TEXT,
    p_contact_number VARCHAR,
    INOUT p_user_id UUID DEFAULT NULL,
    INOUT p_resident_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO users (email, password_hash, role)
    VALUES (p_email, p_password_hash, 'Resident')
    RETURNING id INTO p_user_id;

    INSERT INTO residents (
        user_id, first_name, middle_name, last_name, birthdate,
        gender, purok_zone, address_line, contact_number
    )
    VALUES (
        p_user_id, p_first_name, p_middle_name, p_last_name, p_birthdate,
        p_gender, p_purok_zone, p_address_line, p_contact_number
    )
    RETURNING id INTO p_resident_id;
END;
$$;

-- 4. Procedure: Update Request Status
CREATE OR REPLACE PROCEDURE sp_update_request_status(
    p_request_id UUID,
    p_new_status request_status,
    p_processed_by UUID,
    p_remarks TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM document_requests WHERE id = p_request_id) THEN
        RAISE EXCEPTION 'Document request ID % does not exist', p_request_id;
    END IF;

    UPDATE document_requests
    SET status = p_new_status,
        processed_by = p_processed_by,
        remarks = COALESCE(p_remarks, remarks),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;
END;
$$;

-- 5. Function: Dashboard Analytics
CREATE OR REPLACE FUNCTION fn_get_dashboard_analytics()
RETURNS TABLE (
    total_residents BIGINT,
    total_households BIGINT,
    pending_requests BIGINT,
    approved_requests BIGINT,
    released_requests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM residents WHERE is_archived = FALSE),
        (SELECT COUNT(*) FROM households),
        (SELECT COUNT(*) FROM document_requests WHERE status = 'Pending'),
        (SELECT COUNT(*) FROM document_requests WHERE status = 'Approved'),
        (SELECT COUNT(*) FROM document_requests WHERE status = 'Released');
END;
$$ LANGUAGE plpgsql STABLE;

-- PASSWORD --
ALTER USER postgres WITH PASSWORD 'admin123';


SET search_path TO barangay, public;

INSERT INTO users (email, password_hash, role)
VALUES (
    'staff@barangaylink.gov',
    '$2b$10$B55s3aO6wR17p3Yp/t39E.V061vDvy0P3C5vQc9jHcqyA2B5Qe.n.',
    'Barangay Staff'
);