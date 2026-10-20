--
-- PostgreSQL database dump
--

\restrict cNj38eWkhEHbF34OyNdblL0mXe9Qx2Pg26Ot0f2O1fEWHmRWSEAVacfuFTAmeub

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: operator_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.operator_type AS ENUM (
    'printed',
    'woven',
    'both'
);


--
-- Name: product_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_type AS ENUM (
    'printed',
    'woven'
);


--
-- Name: production_batch_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.production_batch_stage AS ENUM (
    'weaving',
    'printing',
    'cutting',
    'packaging'
);


--
-- Name: production_batch_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.production_batch_status AS ENUM (
    'PLANNED',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: production_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.production_event_type AS ENUM (
    'printing_progress',
    'transfer_to_cutting',
    'cutting_progress',
    'transfer_to_packaging',
    'packaging_progress',
    'assignment',
    'row_update'
);


--
-- Name: production_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.production_order_status AS ENUM (
    'planned',
    'production',
    'complete'
);


--
-- Name: production_run_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.production_run_reason AS ENUM (
    'initial',
    'shortfall',
    'additional_order',
    'recut',
    'rework',
    'retry',
    'other'
);


--
-- Name: production_stage_tx_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.production_stage_tx_type AS ENUM (
    'print_credit',
    'cut_consume_print',
    'cut_credit',
    'package_consume_cut',
    'package_credit'
);


--
-- Name: production_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.production_status AS ENUM (
    'pending',
    'active',
    'paused',
    'completed',
    'cancelled'
);


--
-- Name: roll_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.roll_movement_type AS ENUM (
    'opening_balance',
    'purchase_receipt',
    'purchase_reversal',
    'production_issue',
    'production_release',
    'adjustment'
);


--
-- Name: thread_base_color; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.thread_base_color AS ENUM (
    'White',
    'Black'
);


--
-- Name: thread_denier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.thread_denier AS ENUM (
    '45',
    '75',
    '100',
    '150'
);


--
-- Name: thread_dyeing_send_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.thread_dyeing_send_status AS ENUM (
    'sent',
    'partially_received',
    'received'
);


--
-- Name: thread_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.thread_movement_type AS ENUM (
    'purchase_receipt',
    'dye_consume',
    'dye_produce',
    'production_issue',
    'production_release',
    'adjustment'
);


--
-- Name: thread_stock_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.thread_stock_type AS ENUM (
    'primary',
    'secondary'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'office_staff',
    'production_manager',
    'production_operator'
);


--
-- Name: work_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_order_status AS ENUM (
    'initiate_production',
    'production',
    'complete',
    'dispatched'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: batch_consumptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_consumptions (
    id integer NOT NULL,
    destination_batch_id integer NOT NULL,
    source_batch_id integer NOT NULL,
    source_stage public.production_batch_stage NOT NULL,
    destination_stage public.production_batch_stage NOT NULL,
    rolls numeric(12,2) NOT NULL,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    production_order_id integer NOT NULL,
    CONSTRAINT batch_consumptions_not_self CHECK ((source_batch_id <> destination_batch_id)),
    CONSTRAINT batch_consumptions_positive CHECK ((rolls > (0)::numeric)),
    CONSTRAINT batch_consumptions_valid_adjacency CHECK ((((source_stage = 'printing'::public.production_batch_stage) AND (destination_stage = 'cutting'::public.production_batch_stage)) OR ((source_stage = 'weaving'::public.production_batch_stage) AND (destination_stage = 'cutting'::public.production_batch_stage)) OR ((source_stage = 'cutting'::public.production_batch_stage) AND (destination_stage = 'packaging'::public.production_batch_stage))))
);


--
-- Name: batch_consumptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_consumptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_consumptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_consumptions_id_seq OWNED BY public.batch_consumptions.id;


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: brands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brands_id_seq OWNED BY public.brands.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    location character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    contact_person character varying(255),
    phone character varying(50),
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: ink_consumptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ink_consumptions (
    id integer NOT NULL,
    material_code character varying(100) NOT NULL,
    qty_assigned numeric(12,2) NOT NULL,
    operator_id integer,
    operator_name character varying(200),
    weight numeric(14,3) NOT NULL,
    note text,
    consumed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: ink_consumptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ink_consumptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ink_consumptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ink_consumptions_id_seq OWNED BY public.ink_consumptions.id;


--
-- Name: ink_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ink_purchases (
    id integer NOT NULL,
    report_date date NOT NULL,
    material_code character varying(100) NOT NULL,
    vendor character varying(200) NOT NULL,
    invoice_number character varying(100),
    quantity numeric(12,2) NOT NULL,
    weight_per_qty numeric(12,3) NOT NULL,
    total_weight numeric(14,3) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: ink_purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ink_purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ink_purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ink_purchases_id_seq OWNED BY public.ink_purchases.id;


--
-- Name: inventory_roll_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_roll_movements (
    id integer NOT NULL,
    inventory_roll_id integer NOT NULL,
    material_code character varying(100) NOT NULL,
    movement_type public.roll_movement_type NOT NULL,
    rolls numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    reference_type character varying(50),
    reference_id integer,
    note character varying(500),
    actor_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_roll_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_roll_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_roll_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_roll_movements_id_seq OWNED BY public.inventory_roll_movements.id;


--
-- Name: inventory_rolls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_rolls (
    id integer NOT NULL,
    material_code character varying(100) NOT NULL,
    opening_stock numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    received_rolls numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    issued_rolls numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    balance_rolls numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    roll_per_kg numeric(12,4) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: inventory_rolls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_rolls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_rolls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_rolls_id_seq OWNED BY public.inventory_rolls.id;


--
-- Name: label_sheets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.label_sheets (
    id integer NOT NULL,
    date date NOT NULL,
    material_code character varying(100) NOT NULL,
    sheet_quantity numeric(12,2) NOT NULL,
    weight_per_sheet numeric(12,3) NOT NULL,
    total_weight numeric(14,3) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: label_sheets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.label_sheets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: label_sheets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.label_sheets_id_seq OWNED BY public.label_sheets.id;


--
-- Name: local_sheets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.local_sheets (
    id integer NOT NULL,
    date date NOT NULL,
    material_code character varying(100) NOT NULL,
    packet_quantity numeric(12,2) NOT NULL,
    packet_weight numeric(12,3) NOT NULL,
    total_weight numeric(14,3) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: local_sheets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.local_sheets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: local_sheets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.local_sheets_id_seq OWNED BY public.local_sheets.id;


--
-- Name: machines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machines (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    machine_code character varying(100) NOT NULL,
    machine_operator_id integer,
    machine_type character varying(50) DEFAULT 'Other'::character varying NOT NULL,
    machine_name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    capacity_per_hour integer,
    is_active boolean DEFAULT true NOT NULL,
    product_type public.operator_type DEFAULT 'both'::public.operator_type NOT NULL
);


--
-- Name: machines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.machines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: machines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.machines_id_seq OWNED BY public.machines.id;


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    type character varying(100) NOT NULL,
    description text,
    weight_per_roll numeric(10,4) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    min_stock_level integer DEFAULT 10 NOT NULL,
    reorder_qty integer DEFAULT 50 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;


--
-- Name: operators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operators (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    designation character varying(50) DEFAULT 'Printing'::character varying NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    employee_code character varying(100),
    shift character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    user_id integer,
    operator_type public.operator_type DEFAULT 'both'::public.operator_type NOT NULL,
    avatar_url text
);


--
-- Name: operators_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operators_id_seq OWNED BY public.operators.id;


--
-- Name: production_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_batches (
    id integer NOT NULL,
    production_order_line_id integer,
    stage public.production_batch_stage NOT NULL,
    batch_number integer NOT NULL,
    machine_id integer,
    operator_id integer,
    packaged_qty numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status public.production_batch_status DEFAULT 'PLANNED'::public.production_batch_status NOT NULL,
    notes text,
    created_by_user_id integer,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    assigned_rolls numeric(12,2) DEFAULT '0'::numeric,
    batch_code character varying(32) NOT NULL,
    produced_rolls numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    wasted_rolls numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    consumed_rolls numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    available_rolls numeric(12,2) GENERATED ALWAYS AS ((produced_rolls - consumed_rolls)) STORED,
    woven_production_line_id integer,
    label_size character varying(50),
    production_order_id integer NOT NULL,
    CONSTRAINT production_batches_consumed_within_produced CHECK ((consumed_rolls <= produced_rolls)),
    CONSTRAINT production_batches_first_stage_one_line CHECK ((((stage = ANY (ARRAY['weaving'::public.production_batch_stage, 'printing'::public.production_batch_stage])) AND (num_nonnulls(production_order_line_id, woven_production_line_id) = 1)) OR ((stage = ANY (ARRAY['cutting'::public.production_batch_stage, 'packaging'::public.production_batch_stage])) AND (num_nonnulls(production_order_line_id, woven_production_line_id) = 0)))),
    CONSTRAINT production_batches_non_negative CHECK (((assigned_rolls >= (0)::numeric) AND (produced_rolls >= (0)::numeric) AND (wasted_rolls >= (0)::numeric) AND (consumed_rolls >= (0)::numeric))),
    CONSTRAINT production_batches_output_within_input CHECK (((produced_rolls + wasted_rolls) <= assigned_rolls)),
    CONSTRAINT production_batches_packaging_no_machine CHECK (((stage <> 'packaging'::public.production_batch_stage) OR (machine_id IS NULL))),
    CONSTRAINT production_batches_waste_first_stage_only CHECK (((stage = ANY (ARRAY['printing'::public.production_batch_stage, 'weaving'::public.production_batch_stage])) OR (wasted_rolls = (0)::numeric)))
);


--
-- Name: production_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_batches_id_seq OWNED BY public.production_batches.id;


--
-- Name: production_order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_order_lines (
    id integer NOT NULL,
    production_order_id integer NOT NULL,
    label_type character varying(255) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    label_size numeric(10,2) NOT NULL,
    roll_length numeric(10,2),
    required_rolls numeric(12,4) NOT NULL,
    extra_rolls numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_rolls numeric(10,2) NOT NULL,
    printed_rolls numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    sent_to_cutting_rolls numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    cut_rolls numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    sent_to_packaging_rolls numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    packaged_rolls numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    packaged_qty numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    printing_machine_id integer,
    printing_operator_id integer,
    cutting_machine_id integer,
    cutting_operator_id integer,
    packaging_operator_id integer,
    status public.production_status DEFAULT 'pending'::public.production_status NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    material_code character varying(100),
    issued_rolls numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_weight numeric(14,4),
    printing_completed_at timestamp without time zone,
    cutting_completed_at timestamp without time zone,
    packaging_completed_at timestamp without time zone,
    used_rolls numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    used_weight numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    extra_rolls_returned numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    extra_weight numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    reconciled_at timestamp without time zone,
    sizes jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: production_order_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_order_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_order_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_order_lines_id_seq OWNED BY public.production_order_lines.id;


--
-- Name: production_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_orders (
    id integer NOT NULL,
    production_number character varying(100) NOT NULL,
    work_order_id integer NOT NULL,
    total_qty integer NOT NULL,
    status public.production_order_status DEFAULT 'planned'::public.production_order_status NOT NULL,
    notes text,
    created_by_user_id integer,
    planned_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: production_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_orders_id_seq OWNED BY public.production_orders.id;


--
-- Name: production_roll_issuances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_roll_issuances (
    id integer NOT NULL,
    production_order_line_id integer NOT NULL,
    material_code character varying(100) NOT NULL,
    rolls numeric(10,2) NOT NULL,
    note text,
    actor_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: production_roll_issuances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_roll_issuances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_roll_issuances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_roll_issuances_id_seq OWNED BY public.production_roll_issuances.id;


--
-- Name: production_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_order_id integer NOT NULL,
    product_id character varying(150),
    machine_id integer,
    operator_id integer,
    quantity_produced numeric(12,2) NOT NULL,
    run_reason public.production_run_reason DEFAULT 'initial'::public.production_run_reason NOT NULL,
    notes text,
    produced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer,
    idempotency_key character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: production_stage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_stage_events (
    id integer NOT NULL,
    production_order_line_id integer NOT NULL,
    event_type public.production_event_type NOT NULL,
    previous_value numeric(12,2),
    new_value numeric(12,2),
    delta numeric(12,2),
    actor_user_id integer,
    note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: production_stage_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_stage_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_stage_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_stage_events_id_seq OWNED BY public.production_stage_events.id;


--
-- Name: production_stage_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_stage_transactions (
    id integer NOT NULL,
    production_order_line_id integer NOT NULL,
    batch_id integer,
    stage character varying(50) NOT NULL,
    transaction_type public.production_stage_tx_type NOT NULL,
    quantity numeric(12,2) NOT NULL,
    printed_available_after numeric(12,2) NOT NULL,
    cutted_available_after numeric(12,2) NOT NULL,
    packaged_total_after numeric(12,2) NOT NULL,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: production_stage_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_stage_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_stage_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_stage_transactions_id_seq OWNED BY public.production_stage_transactions.id;


--
-- Name: purchase_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_records (
    id integer NOT NULL,
    report_date date NOT NULL,
    material_code character varying(100) NOT NULL,
    material_type character varying(100),
    item_name character varying(255),
    invoice_number character varying(255),
    vendor character varying(255) NOT NULL,
    carton_qty integer NOT NULL,
    rolls_per_carton integer NOT NULL,
    total_roll numeric(12,2),
    roll_length numeric(10,2) NOT NULL,
    net_weight numeric(10,2) NOT NULL,
    efs character varying(100),
    invoice_weight numeric(10,2),
    local_weight numeric(10,4),
    gd_number character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    total_roll_per_200m numeric(12,2)
);


--
-- Name: purchase_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_records_id_seq OWNED BY public.purchase_records.id;


--
-- Name: sticker_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sticker_materials (
    id integer NOT NULL,
    invoice_date date NOT NULL,
    sticker_size character varying(100) NOT NULL,
    material_code character varying(100) NOT NULL,
    roll_quantity numeric(12,2) NOT NULL,
    weight_per_roll numeric(12,3) NOT NULL,
    total_weight numeric(14,3) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sticker_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sticker_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sticker_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sticker_materials_id_seq OWNED BY public.sticker_materials.id;


--
-- Name: thread_dye_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_dye_batches (
    id integer NOT NULL,
    batch_number character varying(100) NOT NULL,
    from_stock_id integer NOT NULL,
    to_stock_id integer NOT NULL,
    denier public.thread_denier NOT NULL,
    color_name character varying(100) NOT NULL,
    color_code character varying(100) NOT NULL,
    input_weight_kg numeric(14,3) NOT NULL,
    output_weight_kg numeric(14,3) NOT NULL,
    notes character varying(500),
    actor_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_dye_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thread_dye_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thread_dye_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thread_dye_batches_id_seq OWNED BY public.thread_dye_batches.id;


--
-- Name: thread_dyeing_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_dyeing_allocations (
    id integer NOT NULL,
    thread_dyeing_send_id integer NOT NULL,
    color_name character varying(100) NOT NULL,
    pantone character varying(50),
    color_code character varying(50),
    allocated_weight numeric(14,3) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    received_weight numeric(14,3)
);


--
-- Name: thread_dyeing_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thread_dyeing_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thread_dyeing_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thread_dyeing_allocations_id_seq OWNED BY public.thread_dyeing_allocations.id;


--
-- Name: thread_dyeing_receives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_dyeing_receives (
    id integer NOT NULL,
    thread_dyeing_send_id integer NOT NULL,
    receiving_date date NOT NULL,
    receiver_tracking_number character varying(100),
    invoice_number character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_dyeing_receives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thread_dyeing_receives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thread_dyeing_receives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thread_dyeing_receives_id_seq OWNED BY public.thread_dyeing_receives.id;


--
-- Name: thread_dyeing_sends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_dyeing_sends (
    id integer NOT NULL,
    service_provider_id integer NOT NULL,
    sending_date date NOT NULL,
    sender_tracking_number character varying(100),
    denier public.thread_denier NOT NULL,
    base_thread_color public.thread_base_color NOT NULL,
    total_weight_sent numeric(14,3) NOT NULL,
    status public.thread_dyeing_send_status DEFAULT 'sent'::public.thread_dyeing_send_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_dyeing_sends_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thread_dyeing_sends_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thread_dyeing_sends_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thread_dyeing_sends_id_seq OWNED BY public.thread_dyeing_sends.id;


--
-- Name: thread_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_purchases (
    id integer NOT NULL,
    received_date date NOT NULL,
    item_name character varying(100) DEFAULT 'Thread'::character varying NOT NULL,
    denier public.thread_denier NOT NULL,
    thread_color public.thread_base_color NOT NULL,
    vendor character varying(255) NOT NULL,
    invoice_number character varying(100) NOT NULL,
    total_ctns integer NOT NULL,
    weight_per_ctn_kg numeric(12,3) NOT NULL,
    total_weight_kg numeric(14,3) NOT NULL,
    notes character varying(500),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thread_purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thread_purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thread_purchases_id_seq OWNED BY public.thread_purchases.id;


--
-- Name: thread_service_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_service_providers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact character varying(100),
    address text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_service_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thread_service_providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thread_service_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thread_service_providers_id_seq OWNED BY public.thread_service_providers.id;


--
-- Name: thread_stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_stock_movements (
    id integer NOT NULL,
    thread_stock_id integer NOT NULL,
    movement_type public.thread_movement_type NOT NULL,
    weight_kg numeric(14,3) NOT NULL,
    balance_after_kg numeric(14,3) NOT NULL,
    reference_type character varying(50),
    reference_id integer,
    note character varying(500),
    actor_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thread_stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thread_stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thread_stock_movements_id_seq OWNED BY public.thread_stock_movements.id;


--
-- Name: thread_stocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_stocks (
    id integer NOT NULL,
    stock_type public.thread_stock_type NOT NULL,
    denier public.thread_denier NOT NULL,
    color_name character varying(100) NOT NULL,
    color_code character varying(100),
    balance_kg numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    received_kg numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    consumed_kg numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: thread_stocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thread_stocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thread_stocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thread_stocks_id_seq OWNED BY public.thread_stocks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    employee_code character varying(100),
    email character varying(255),
    role public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_orders (
    id integer NOT NULL,
    so_number character varying(100) NOT NULL,
    po_number character varying(100),
    order_date date NOT NULL,
    due_date date,
    total_qty integer NOT NULL,
    brand_id integer,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status public.work_order_status DEFAULT 'initiate_production'::public.work_order_status NOT NULL,
    dc_number character varying(100),
    dispatched_date date,
    product_type public.product_type DEFAULT 'printed'::public.product_type NOT NULL,
    lc_number character varying(100),
    dispatched_qty integer,
    fbr_invoice_number character varying(100),
    image_url text,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    order_type character varying(30) DEFAULT 'normal order'::character varying NOT NULL
);


--
-- Name: work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_orders_id_seq OWNED BY public.work_orders.id;


--
-- Name: woven_production_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.woven_production_lines (
    id integer NOT NULL,
    production_order_id integer NOT NULL,
    quantity numeric(14,2) NOT NULL,
    total_thread_weight_kg numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    planning_completed_at timestamp without time zone,
    woven_qty numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    weaving_status public.production_status DEFAULT 'pending'::public.production_status NOT NULL,
    weaving_started_at timestamp without time zone,
    weaving_ended_at timestamp without time zone,
    cut_qty numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    cutting_date date,
    packaged_qty numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    packaged_weight_kg numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    packaging_date date,
    status public.production_status DEFAULT 'pending'::public.production_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    label_type character varying(255) NOT NULL,
    sizes jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: woven_production_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.woven_production_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: woven_production_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.woven_production_lines_id_seq OWNED BY public.woven_production_lines.id;


--
-- Name: woven_thread_plan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.woven_thread_plan_items (
    id integer NOT NULL,
    woven_production_line_id integer NOT NULL,
    sort_order integer NOT NULL,
    color_name character varying(100) NOT NULL,
    denier public.thread_denier NOT NULL,
    color_code character varying(100) NOT NULL,
    weight_kg numeric(14,3) NOT NULL,
    thread_stock_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    remaining_weight_kg numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    actual_consumed_weight_kg numeric(14,3)
);


--
-- Name: woven_thread_plan_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.woven_thread_plan_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: woven_thread_plan_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.woven_thread_plan_items_id_seq OWNED BY public.woven_thread_plan_items.id;


--
-- Name: woven_work_order_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.woven_work_order_details (
    id integer NOT NULL,
    work_order_id integer NOT NULL,
    design_code character varying(100) NOT NULL,
    pick integer NOT NULL,
    repeat numeric(12,2) NOT NULL,
    density integer NOT NULL,
    extra numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    size_labels jsonb DEFAULT '[]'::jsonb NOT NULL,
    speed numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    estimated_weaving_hours numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: woven_work_order_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.woven_work_order_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: woven_work_order_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.woven_work_order_details_id_seq OWNED BY public.woven_work_order_details.id;


--
-- Name: batch_consumptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_consumptions ALTER COLUMN id SET DEFAULT nextval('public.batch_consumptions_id_seq'::regclass);


--
-- Name: brands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands ALTER COLUMN id SET DEFAULT nextval('public.brands_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: ink_consumptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ink_consumptions ALTER COLUMN id SET DEFAULT nextval('public.ink_consumptions_id_seq'::regclass);


--
-- Name: ink_purchases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ink_purchases ALTER COLUMN id SET DEFAULT nextval('public.ink_purchases_id_seq'::regclass);


--
-- Name: inventory_roll_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_roll_movements ALTER COLUMN id SET DEFAULT nextval('public.inventory_roll_movements_id_seq'::regclass);


--
-- Name: inventory_rolls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_rolls ALTER COLUMN id SET DEFAULT nextval('public.inventory_rolls_id_seq'::regclass);


--
-- Name: label_sheets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_sheets ALTER COLUMN id SET DEFAULT nextval('public.label_sheets_id_seq'::regclass);


--
-- Name: local_sheets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_sheets ALTER COLUMN id SET DEFAULT nextval('public.local_sheets_id_seq'::regclass);


--
-- Name: machines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines ALTER COLUMN id SET DEFAULT nextval('public.machines_id_seq'::regclass);


--
-- Name: materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);


--
-- Name: operators id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operators ALTER COLUMN id SET DEFAULT nextval('public.operators_id_seq'::regclass);


--
-- Name: production_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches ALTER COLUMN id SET DEFAULT nextval('public.production_batches_id_seq'::regclass);


--
-- Name: production_order_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines ALTER COLUMN id SET DEFAULT nextval('public.production_order_lines_id_seq'::regclass);


--
-- Name: production_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders ALTER COLUMN id SET DEFAULT nextval('public.production_orders_id_seq'::regclass);


--
-- Name: production_roll_issuances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_roll_issuances ALTER COLUMN id SET DEFAULT nextval('public.production_roll_issuances_id_seq'::regclass);


--
-- Name: production_stage_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_events ALTER COLUMN id SET DEFAULT nextval('public.production_stage_events_id_seq'::regclass);


--
-- Name: production_stage_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_transactions ALTER COLUMN id SET DEFAULT nextval('public.production_stage_transactions_id_seq'::regclass);


--
-- Name: purchase_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_records ALTER COLUMN id SET DEFAULT nextval('public.purchase_records_id_seq'::regclass);


--
-- Name: sticker_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sticker_materials ALTER COLUMN id SET DEFAULT nextval('public.sticker_materials_id_seq'::regclass);


--
-- Name: thread_dye_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dye_batches ALTER COLUMN id SET DEFAULT nextval('public.thread_dye_batches_id_seq'::regclass);


--
-- Name: thread_dyeing_allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_allocations ALTER COLUMN id SET DEFAULT nextval('public.thread_dyeing_allocations_id_seq'::regclass);


--
-- Name: thread_dyeing_receives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_receives ALTER COLUMN id SET DEFAULT nextval('public.thread_dyeing_receives_id_seq'::regclass);


--
-- Name: thread_dyeing_sends id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_sends ALTER COLUMN id SET DEFAULT nextval('public.thread_dyeing_sends_id_seq'::regclass);


--
-- Name: thread_purchases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_purchases ALTER COLUMN id SET DEFAULT nextval('public.thread_purchases_id_seq'::regclass);


--
-- Name: thread_service_providers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_service_providers ALTER COLUMN id SET DEFAULT nextval('public.thread_service_providers_id_seq'::regclass);


--
-- Name: thread_stock_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_stock_movements ALTER COLUMN id SET DEFAULT nextval('public.thread_stock_movements_id_seq'::regclass);


--
-- Name: thread_stocks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_stocks ALTER COLUMN id SET DEFAULT nextval('public.thread_stocks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders ALTER COLUMN id SET DEFAULT nextval('public.work_orders_id_seq'::regclass);


--
-- Name: woven_production_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_production_lines ALTER COLUMN id SET DEFAULT nextval('public.woven_production_lines_id_seq'::regclass);


--
-- Name: woven_thread_plan_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_thread_plan_items ALTER COLUMN id SET DEFAULT nextval('public.woven_thread_plan_items_id_seq'::regclass);


--
-- Name: woven_work_order_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_work_order_details ALTER COLUMN id SET DEFAULT nextval('public.woven_work_order_details_id_seq'::regclass);


--
-- Name: batch_consumptions batch_consumptions_pair_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_consumptions
    ADD CONSTRAINT batch_consumptions_pair_uq UNIQUE (destination_batch_id, source_batch_id);


--
-- Name: batch_consumptions batch_consumptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_consumptions
    ADD CONSTRAINT batch_consumptions_pkey PRIMARY KEY (id);


--
-- Name: brands brands_company_name_idx; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_company_name_idx UNIQUE (company_id, name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: companies companies_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_unique UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: ink_consumptions ink_consumptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ink_consumptions
    ADD CONSTRAINT ink_consumptions_pkey PRIMARY KEY (id);


--
-- Name: ink_purchases ink_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ink_purchases
    ADD CONSTRAINT ink_purchases_pkey PRIMARY KEY (id);


--
-- Name: inventory_roll_movements inventory_roll_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_roll_movements
    ADD CONSTRAINT inventory_roll_movements_pkey PRIMARY KEY (id);


--
-- Name: inventory_rolls inventory_rolls_material_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_rolls
    ADD CONSTRAINT inventory_rolls_material_code_unique UNIQUE (material_code);


--
-- Name: inventory_rolls inventory_rolls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_rolls
    ADD CONSTRAINT inventory_rolls_pkey PRIMARY KEY (id);


--
-- Name: label_sheets label_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_sheets
    ADD CONSTRAINT label_sheets_pkey PRIMARY KEY (id);


--
-- Name: local_sheets local_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_sheets
    ADD CONSTRAINT local_sheets_pkey PRIMARY KEY (id);


--
-- Name: machines machines_machine_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_machine_code_unique UNIQUE (machine_code);


--
-- Name: machines machines_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_name_unique UNIQUE (name);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: materials materials_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_code_unique UNIQUE (code);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: operators operators_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operators
    ADD CONSTRAINT operators_name_unique UNIQUE (name);


--
-- Name: operators operators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operators
    ADD CONSTRAINT operators_pkey PRIMARY KEY (id);


--
-- Name: production_batches production_batches_id_order_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_id_order_uq UNIQUE (id, production_order_id);


--
-- Name: production_batches production_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_pkey PRIMARY KEY (id);


--
-- Name: production_order_lines production_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines
    ADD CONSTRAINT production_order_lines_pkey PRIMARY KEY (id);


--
-- Name: production_orders production_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);


--
-- Name: production_orders production_orders_production_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_production_number_unique UNIQUE (production_number);


--
-- Name: production_orders production_orders_work_order_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_work_order_id_unique UNIQUE (work_order_id);


--
-- Name: production_roll_issuances production_roll_issuances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_roll_issuances
    ADD CONSTRAINT production_roll_issuances_pkey PRIMARY KEY (id);


--
-- Name: production_runs production_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_pkey PRIMARY KEY (id);


--
-- Name: production_stage_events production_stage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_events
    ADD CONSTRAINT production_stage_events_pkey PRIMARY KEY (id);


--
-- Name: production_stage_transactions production_stage_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_transactions
    ADD CONSTRAINT production_stage_transactions_pkey PRIMARY KEY (id);


--
-- Name: purchase_records purchase_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_records
    ADD CONSTRAINT purchase_records_pkey PRIMARY KEY (id);


--
-- Name: sticker_materials sticker_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sticker_materials
    ADD CONSTRAINT sticker_materials_pkey PRIMARY KEY (id);


--
-- Name: thread_dye_batches thread_dye_batches_batch_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dye_batches
    ADD CONSTRAINT thread_dye_batches_batch_number_unique UNIQUE (batch_number);


--
-- Name: thread_dye_batches thread_dye_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dye_batches
    ADD CONSTRAINT thread_dye_batches_pkey PRIMARY KEY (id);


--
-- Name: thread_dyeing_allocations thread_dyeing_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_allocations
    ADD CONSTRAINT thread_dyeing_allocations_pkey PRIMARY KEY (id);


--
-- Name: thread_dyeing_receives thread_dyeing_receives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_receives
    ADD CONSTRAINT thread_dyeing_receives_pkey PRIMARY KEY (id);


--
-- Name: thread_dyeing_sends thread_dyeing_sends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_sends
    ADD CONSTRAINT thread_dyeing_sends_pkey PRIMARY KEY (id);


--
-- Name: thread_purchases thread_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_purchases
    ADD CONSTRAINT thread_purchases_pkey PRIMARY KEY (id);


--
-- Name: thread_service_providers thread_service_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_service_providers
    ADD CONSTRAINT thread_service_providers_pkey PRIMARY KEY (id);


--
-- Name: thread_stock_movements thread_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_stock_movements
    ADD CONSTRAINT thread_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: thread_stocks thread_stocks_identity_idx; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_stocks
    ADD CONSTRAINT thread_stocks_identity_idx UNIQUE (stock_type, denier, color_name, color_code);


--
-- Name: thread_stocks thread_stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_stocks
    ADD CONSTRAINT thread_stocks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_so_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_so_number_unique UNIQUE (so_number);


--
-- Name: woven_production_lines woven_production_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_production_lines
    ADD CONSTRAINT woven_production_lines_pkey PRIMARY KEY (id);


--
-- Name: woven_thread_plan_items woven_thread_plan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_thread_plan_items
    ADD CONSTRAINT woven_thread_plan_items_pkey PRIMARY KEY (id);


--
-- Name: woven_thread_plan_items woven_thread_plan_items_slot_idx; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_thread_plan_items
    ADD CONSTRAINT woven_thread_plan_items_slot_idx UNIQUE (woven_production_line_id, sort_order);


--
-- Name: woven_work_order_details woven_work_order_details_design_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_work_order_details
    ADD CONSTRAINT woven_work_order_details_design_code_unique UNIQUE (design_code);


--
-- Name: woven_work_order_details woven_work_order_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_work_order_details
    ADD CONSTRAINT woven_work_order_details_pkey PRIMARY KEY (id);


--
-- Name: woven_work_order_details woven_work_order_details_work_order_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_work_order_details
    ADD CONSTRAINT woven_work_order_details_work_order_id_unique UNIQUE (work_order_id);


--
-- Name: batch_consumptions_destination_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batch_consumptions_destination_idx ON public.batch_consumptions USING btree (destination_batch_id);


--
-- Name: batch_consumptions_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batch_consumptions_order_idx ON public.batch_consumptions USING btree (production_order_id);


--
-- Name: batch_consumptions_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batch_consumptions_source_idx ON public.batch_consumptions USING btree (source_batch_id);


--
-- Name: brands_company_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brands_company_idx ON public.brands USING btree (company_id);


--
-- Name: ink_consumptions_material_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ink_consumptions_material_code_idx ON public.ink_consumptions USING btree (material_code);


--
-- Name: ink_consumptions_operator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ink_consumptions_operator_idx ON public.ink_consumptions USING btree (operator_id);


--
-- Name: ink_purchases_material_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ink_purchases_material_code_idx ON public.ink_purchases USING btree (material_code);


--
-- Name: inventory_roll_movements_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_roll_movements_created_idx ON public.inventory_roll_movements USING btree (created_at);


--
-- Name: inventory_roll_movements_material_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_roll_movements_material_idx ON public.inventory_roll_movements USING btree (material_code);


--
-- Name: inventory_roll_movements_roll_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_roll_movements_roll_idx ON public.inventory_roll_movements USING btree (inventory_roll_id);


--
-- Name: label_sheets_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX label_sheets_date_idx ON public.label_sheets USING btree (date);


--
-- Name: label_sheets_material_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX label_sheets_material_code_idx ON public.label_sheets USING btree (material_code);


--
-- Name: local_sheets_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX local_sheets_date_idx ON public.local_sheets USING btree (date);


--
-- Name: local_sheets_material_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX local_sheets_material_code_idx ON public.local_sheets USING btree (material_code);


--
-- Name: operators_designation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operators_designation_idx ON public.operators USING btree (designation);


--
-- Name: operators_operator_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operators_operator_type_idx ON public.operators USING btree (operator_type);


--
-- Name: production_batches_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_created_at_idx ON public.production_batches USING btree (created_at);


--
-- Name: production_batches_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_line_idx ON public.production_batches USING btree (production_order_line_id);


--
-- Name: production_batches_line_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_line_stage_idx ON public.production_batches USING btree (production_order_line_id, stage);


--
-- Name: production_batches_machine_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_machine_idx ON public.production_batches USING btree (machine_id);


--
-- Name: production_batches_operator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_operator_idx ON public.production_batches USING btree (operator_id);


--
-- Name: production_batches_order_stage_no_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_batches_order_stage_no_uq ON public.production_batches USING btree (production_order_id, stage, batch_number) WHERE (stage = ANY (ARRAY['cutting'::public.production_batch_stage, 'packaging'::public.production_batch_stage]));


--
-- Name: production_batches_printed_no_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_batches_printed_no_uq ON public.production_batches USING btree (production_order_line_id, stage, batch_number) WHERE (production_order_line_id IS NOT NULL);


--
-- Name: production_batches_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_stage_idx ON public.production_batches USING btree (stage);


--
-- Name: production_batches_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_status_idx ON public.production_batches USING btree (status);


--
-- Name: production_batches_woven_line_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_woven_line_stage_idx ON public.production_batches USING btree (woven_production_line_id, stage);


--
-- Name: production_batches_woven_line_stage_no_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_batches_woven_line_stage_no_uq ON public.production_batches USING btree (woven_production_line_id, stage, batch_number) WHERE (woven_production_line_id IS NOT NULL);


--
-- Name: production_batches_woven_no_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_batches_woven_no_uq ON public.production_batches USING btree (woven_production_line_id, stage, batch_number) WHERE (woven_production_line_id IS NOT NULL);


--
-- Name: production_batches_woven_size_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_woven_size_idx ON public.production_batches USING btree (woven_production_line_id, stage, label_size);


--
-- Name: production_order_lines_cutting_machine_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_lines_cutting_machine_idx ON public.production_order_lines USING btree (cutting_machine_id);


--
-- Name: production_order_lines_cutting_operator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_lines_cutting_operator_idx ON public.production_order_lines USING btree (cutting_operator_id);


--
-- Name: production_order_lines_material_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_lines_material_code_idx ON public.production_order_lines USING btree (material_code);


--
-- Name: production_order_lines_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_lines_order_idx ON public.production_order_lines USING btree (production_order_id);


--
-- Name: production_order_lines_packaging_operator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_lines_packaging_operator_idx ON public.production_order_lines USING btree (packaging_operator_id);


--
-- Name: production_order_lines_printing_machine_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_lines_printing_machine_idx ON public.production_order_lines USING btree (printing_machine_id);


--
-- Name: production_order_lines_printing_operator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_lines_printing_operator_idx ON public.production_order_lines USING btree (printing_operator_id);


--
-- Name: production_order_lines_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_lines_status_idx ON public.production_order_lines USING btree (status);


--
-- Name: production_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_orders_status_idx ON public.production_orders USING btree (status);


--
-- Name: production_orders_work_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_orders_work_order_idx ON public.production_orders USING btree (work_order_id);


--
-- Name: production_roll_issuances_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_roll_issuances_line_idx ON public.production_roll_issuances USING btree (production_order_line_id);


--
-- Name: production_roll_issuances_material_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_roll_issuances_material_code_idx ON public.production_roll_issuances USING btree (material_code);


--
-- Name: production_runs_idempotency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_runs_idempotency_idx ON public.production_runs USING btree (idempotency_key);


--
-- Name: production_runs_produced_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_runs_produced_at_idx ON public.production_runs USING btree (produced_at);


--
-- Name: production_runs_sale_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_runs_sale_order_idx ON public.production_runs USING btree (sale_order_id);


--
-- Name: production_stage_events_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_stage_events_actor_idx ON public.production_stage_events USING btree (actor_user_id);


--
-- Name: production_stage_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_stage_events_created_at_idx ON public.production_stage_events USING btree (created_at);


--
-- Name: production_stage_events_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_stage_events_line_idx ON public.production_stage_events USING btree (production_order_line_id);


--
-- Name: production_stage_tx_batch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_stage_tx_batch_idx ON public.production_stage_transactions USING btree (batch_id);


--
-- Name: production_stage_tx_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_stage_tx_created_at_idx ON public.production_stage_transactions USING btree (created_at);


--
-- Name: production_stage_tx_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_stage_tx_line_idx ON public.production_stage_transactions USING btree (production_order_line_id);


--
-- Name: production_stage_tx_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_stage_tx_type_idx ON public.production_stage_transactions USING btree (transaction_type);


--
-- Name: purchase_records_material_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_records_material_code_idx ON public.purchase_records USING btree (material_code);


--
-- Name: sticker_materials_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sticker_materials_date_idx ON public.sticker_materials USING btree (invoice_date);


--
-- Name: sticker_materials_material_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sticker_materials_material_code_idx ON public.sticker_materials USING btree (material_code);


--
-- Name: thread_dye_batches_from_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_dye_batches_from_idx ON public.thread_dye_batches USING btree (from_stock_id);


--
-- Name: thread_dye_batches_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_dye_batches_to_idx ON public.thread_dye_batches USING btree (to_stock_id);


--
-- Name: thread_dyeing_allocations_send_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_dyeing_allocations_send_idx ON public.thread_dyeing_allocations USING btree (thread_dyeing_send_id);


--
-- Name: thread_dyeing_receives_send_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_dyeing_receives_send_idx ON public.thread_dyeing_receives USING btree (thread_dyeing_send_id);


--
-- Name: thread_dyeing_sends_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_dyeing_sends_date_idx ON public.thread_dyeing_sends USING btree (sending_date);


--
-- Name: thread_dyeing_sends_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_dyeing_sends_provider_idx ON public.thread_dyeing_sends USING btree (service_provider_id);


--
-- Name: thread_purchases_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_purchases_date_idx ON public.thread_purchases USING btree (received_date);


--
-- Name: thread_purchases_invoice_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_purchases_invoice_idx ON public.thread_purchases USING btree (invoice_number);


--
-- Name: thread_purchases_vendor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_purchases_vendor_idx ON public.thread_purchases USING btree (vendor);


--
-- Name: thread_service_providers_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_service_providers_name_idx ON public.thread_service_providers USING btree (name);


--
-- Name: thread_stock_movements_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_stock_movements_created_idx ON public.thread_stock_movements USING btree (created_at);


--
-- Name: thread_stock_movements_stock_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_stock_movements_stock_idx ON public.thread_stock_movements USING btree (thread_stock_id);


--
-- Name: thread_stock_movements_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_stock_movements_type_idx ON public.thread_stock_movements USING btree (movement_type);


--
-- Name: thread_stocks_denier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_stocks_denier_idx ON public.thread_stocks USING btree (denier);


--
-- Name: thread_stocks_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_stocks_type_idx ON public.thread_stocks USING btree (stock_type);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: work_orders_brand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_brand_idx ON public.work_orders USING btree (brand_id);


--
-- Name: work_orders_dc_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_dc_number_idx ON public.work_orders USING btree (dc_number);


--
-- Name: work_orders_fbr_invoice_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_fbr_invoice_idx ON public.work_orders USING btree (fbr_invoice_number);


--
-- Name: work_orders_lc_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_lc_number_idx ON public.work_orders USING btree (lc_number);


--
-- Name: work_orders_product_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_product_type_idx ON public.work_orders USING btree (product_type);


--
-- Name: work_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_orders_status_idx ON public.work_orders USING btree (status);


--
-- Name: woven_production_lines_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX woven_production_lines_order_idx ON public.woven_production_lines USING btree (production_order_id);


--
-- Name: woven_production_lines_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX woven_production_lines_status_idx ON public.woven_production_lines USING btree (status);


--
-- Name: woven_thread_plan_items_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX woven_thread_plan_items_line_idx ON public.woven_thread_plan_items USING btree (woven_production_line_id);


--
-- Name: woven_wo_details_design_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX woven_wo_details_design_code_idx ON public.woven_work_order_details USING btree (design_code);


--
-- Name: woven_wo_details_work_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX woven_wo_details_work_order_idx ON public.woven_work_order_details USING btree (work_order_id);


--
-- Name: batch_consumptions batch_consumptions_destination_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_consumptions
    ADD CONSTRAINT batch_consumptions_destination_fk FOREIGN KEY (destination_batch_id, production_order_id) REFERENCES public.production_batches(id, production_order_id) ON DELETE CASCADE;


--
-- Name: batch_consumptions batch_consumptions_order_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_consumptions
    ADD CONSTRAINT batch_consumptions_order_fk FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: batch_consumptions batch_consumptions_source_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_consumptions
    ADD CONSTRAINT batch_consumptions_source_fk FOREIGN KEY (source_batch_id, production_order_id) REFERENCES public.production_batches(id, production_order_id) ON DELETE RESTRICT;


--
-- Name: batch_consumptions batch_consumptions_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_consumptions
    ADD CONSTRAINT batch_consumptions_user_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: brands brands_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: ink_consumptions ink_consumptions_operator_id_operators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ink_consumptions
    ADD CONSTRAINT ink_consumptions_operator_id_operators_id_fk FOREIGN KEY (operator_id) REFERENCES public.operators(id);


--
-- Name: inventory_roll_movements inventory_roll_movements_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_roll_movements
    ADD CONSTRAINT inventory_roll_movements_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: inventory_roll_movements inventory_roll_movements_inventory_roll_id_inventory_rolls_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_roll_movements
    ADD CONSTRAINT inventory_roll_movements_inventory_roll_id_inventory_rolls_id_f FOREIGN KEY (inventory_roll_id) REFERENCES public.inventory_rolls(id) ON DELETE CASCADE;


--
-- Name: inventory_rolls inventory_rolls_material_code_materials_code_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_rolls
    ADD CONSTRAINT inventory_rolls_material_code_materials_code_fk FOREIGN KEY (material_code) REFERENCES public.materials(code);


--
-- Name: machines machines_machine_operator_id_operators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_machine_operator_id_operators_id_fk FOREIGN KEY (machine_operator_id) REFERENCES public.operators(id);


--
-- Name: operators operators_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operators
    ADD CONSTRAINT operators_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: production_batches production_batches_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: production_batches production_batches_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: production_batches production_batches_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operators(id);


--
-- Name: production_batches production_batches_order_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_order_fk FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_batches production_batches_production_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_production_order_line_id_fkey FOREIGN KEY (production_order_line_id) REFERENCES public.production_order_lines(id) ON DELETE CASCADE;


--
-- Name: production_batches production_batches_woven_line_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_woven_line_fk FOREIGN KEY (woven_production_line_id) REFERENCES public.woven_production_lines(id) ON DELETE CASCADE;


--
-- Name: production_order_lines production_order_lines_cutting_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines
    ADD CONSTRAINT production_order_lines_cutting_machine_id_machines_id_fk FOREIGN KEY (cutting_machine_id) REFERENCES public.machines(id);


--
-- Name: production_order_lines production_order_lines_cutting_operator_id_operators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines
    ADD CONSTRAINT production_order_lines_cutting_operator_id_operators_id_fk FOREIGN KEY (cutting_operator_id) REFERENCES public.operators(id);


--
-- Name: production_order_lines production_order_lines_material_code_materials_code_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines
    ADD CONSTRAINT production_order_lines_material_code_materials_code_fk FOREIGN KEY (material_code) REFERENCES public.materials(code);


--
-- Name: production_order_lines production_order_lines_packaging_operator_id_operators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines
    ADD CONSTRAINT production_order_lines_packaging_operator_id_operators_id_fk FOREIGN KEY (packaging_operator_id) REFERENCES public.operators(id);


--
-- Name: production_order_lines production_order_lines_printing_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines
    ADD CONSTRAINT production_order_lines_printing_machine_id_machines_id_fk FOREIGN KEY (printing_machine_id) REFERENCES public.machines(id);


--
-- Name: production_order_lines production_order_lines_printing_operator_id_operators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines
    ADD CONSTRAINT production_order_lines_printing_operator_id_operators_id_fk FOREIGN KEY (printing_operator_id) REFERENCES public.operators(id);


--
-- Name: production_order_lines production_order_lines_production_order_id_production_orders_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_lines
    ADD CONSTRAINT production_order_lines_production_order_id_production_orders_id FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_orders production_orders_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: production_orders production_orders_work_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_work_order_id_work_orders_id_fk FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE RESTRICT;


--
-- Name: production_roll_issuances production_roll_issuances_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_roll_issuances
    ADD CONSTRAINT production_roll_issuances_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: production_roll_issuances production_roll_issuances_material_code_materials_code_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_roll_issuances
    ADD CONSTRAINT production_roll_issuances_material_code_materials_code_fk FOREIGN KEY (material_code) REFERENCES public.materials(code);


--
-- Name: production_roll_issuances production_roll_issuances_production_order_line_id_production_o; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_roll_issuances
    ADD CONSTRAINT production_roll_issuances_production_order_line_id_production_o FOREIGN KEY (production_order_line_id) REFERENCES public.production_order_lines(id) ON DELETE CASCADE;


--
-- Name: production_runs production_runs_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: production_runs production_runs_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_machine_id_machines_id_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: production_runs production_runs_operator_id_operators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_operator_id_operators_id_fk FOREIGN KEY (operator_id) REFERENCES public.operators(id);


--
-- Name: production_runs production_runs_sale_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_sale_order_id_work_orders_id_fk FOREIGN KEY (sale_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: production_stage_events production_stage_events_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_events
    ADD CONSTRAINT production_stage_events_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: production_stage_events production_stage_events_production_order_line_id_production_ord; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_events
    ADD CONSTRAINT production_stage_events_production_order_line_id_production_ord FOREIGN KEY (production_order_line_id) REFERENCES public.production_order_lines(id) ON DELETE CASCADE;


--
-- Name: production_stage_transactions production_stage_transactions_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_transactions
    ADD CONSTRAINT production_stage_transactions_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.production_batches(id) ON DELETE SET NULL;


--
-- Name: production_stage_transactions production_stage_transactions_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_transactions
    ADD CONSTRAINT production_stage_transactions_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: production_stage_transactions production_stage_transactions_production_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stage_transactions
    ADD CONSTRAINT production_stage_transactions_production_order_line_id_fkey FOREIGN KEY (production_order_line_id) REFERENCES public.production_order_lines(id) ON DELETE CASCADE;


--
-- Name: purchase_records purchase_records_material_code_materials_code_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_records
    ADD CONSTRAINT purchase_records_material_code_materials_code_fk FOREIGN KEY (material_code) REFERENCES public.materials(code);


--
-- Name: thread_dye_batches thread_dye_batches_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dye_batches
    ADD CONSTRAINT thread_dye_batches_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: thread_dye_batches thread_dye_batches_from_stock_id_thread_stocks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dye_batches
    ADD CONSTRAINT thread_dye_batches_from_stock_id_thread_stocks_id_fk FOREIGN KEY (from_stock_id) REFERENCES public.thread_stocks(id) ON DELETE RESTRICT;


--
-- Name: thread_dye_batches thread_dye_batches_to_stock_id_thread_stocks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dye_batches
    ADD CONSTRAINT thread_dye_batches_to_stock_id_thread_stocks_id_fk FOREIGN KEY (to_stock_id) REFERENCES public.thread_stocks(id) ON DELETE RESTRICT;


--
-- Name: thread_dyeing_allocations thread_dyeing_allocations_thread_dyeing_send_id_thread_dyeing_s; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_allocations
    ADD CONSTRAINT thread_dyeing_allocations_thread_dyeing_send_id_thread_dyeing_s FOREIGN KEY (thread_dyeing_send_id) REFERENCES public.thread_dyeing_sends(id) ON DELETE CASCADE;


--
-- Name: thread_dyeing_receives thread_dyeing_receives_thread_dyeing_send_id_thread_dyeing_send; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_receives
    ADD CONSTRAINT thread_dyeing_receives_thread_dyeing_send_id_thread_dyeing_send FOREIGN KEY (thread_dyeing_send_id) REFERENCES public.thread_dyeing_sends(id) ON DELETE CASCADE;


--
-- Name: thread_dyeing_sends thread_dyeing_sends_service_provider_id_thread_service_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_dyeing_sends
    ADD CONSTRAINT thread_dyeing_sends_service_provider_id_thread_service_provider FOREIGN KEY (service_provider_id) REFERENCES public.thread_service_providers(id);


--
-- Name: thread_stock_movements thread_stock_movements_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_stock_movements
    ADD CONSTRAINT thread_stock_movements_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: thread_stock_movements thread_stock_movements_thread_stock_id_thread_stocks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_stock_movements
    ADD CONSTRAINT thread_stock_movements_thread_stock_id_thread_stocks_id_fk FOREIGN KEY (thread_stock_id) REFERENCES public.thread_stocks(id) ON DELETE CASCADE;


--
-- Name: work_orders work_orders_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: woven_production_lines woven_production_lines_production_order_id_production_orders_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_production_lines
    ADD CONSTRAINT woven_production_lines_production_order_id_production_orders_id FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: woven_thread_plan_items woven_thread_plan_items_thread_stock_id_thread_stocks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_thread_plan_items
    ADD CONSTRAINT woven_thread_plan_items_thread_stock_id_thread_stocks_id_fk FOREIGN KEY (thread_stock_id) REFERENCES public.thread_stocks(id) ON DELETE SET NULL;


--
-- Name: woven_thread_plan_items woven_thread_plan_items_woven_production_line_id_woven_producti; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_thread_plan_items
    ADD CONSTRAINT woven_thread_plan_items_woven_production_line_id_woven_producti FOREIGN KEY (woven_production_line_id) REFERENCES public.woven_production_lines(id) ON DELETE CASCADE;


--
-- Name: woven_work_order_details woven_work_order_details_work_order_id_work_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woven_work_order_details
    ADD CONSTRAINT woven_work_order_details_work_order_id_work_orders_id_fk FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict cNj38eWkhEHbF34OyNdblL0mXe9Qx2Pg26Ot0f2O1fEWHmRWSEAVacfuFTAmeub

