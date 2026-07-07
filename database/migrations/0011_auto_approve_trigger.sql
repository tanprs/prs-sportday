-- ============================================================
-- 0011: auto_approve_team trigger
--
-- เมื่อทีมเปลี่ยนสถานะเป็น submitted ให้ตรวจจำนวนสมาชิก
-- เทียบกับ sport_types.team_size ของชนิดกีฬานั้น
--   - ถ้าสมาชิกครบ → auto-approve ทันที (status = 'approved', approved_at = now())
--   - ถ้าไม่ครบ    → ค้างเป็น submitted รอแอดมิน/ครูประจำสีอนุมัติด้วยตนเอง
--
-- approved_by ถูกปล่อยเป็น NULL เพื่อแยกแยะ auto-approve จากการอนุมัติโดยมนุษย์
-- SECURITY DEFINER ให้ฟังก์ชันอ่าน team_members ได้โดยตรง ไม่ติด RLS ของ caller
-- ============================================================

CREATE OR REPLACE FUNCTION auto_approve_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_size    INTEGER;
  v_member_count BIGINT;
BEGIN
  -- ทำงานเฉพาะตอนที่ status เพิ่งเปลี่ยนมาเป็น submitted เท่านั้น
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN

    -- ดึง team_size ของชนิดกีฬาที่ทีมนี้สมัคร
    SELECT team_size INTO v_team_size
    FROM sport_types
    WHERE id = NEW.sport_id;

    -- นับสมาชิกปัจจุบัน
    SELECT COUNT(*) INTO v_member_count
    FROM team_members
    WHERE team_id = NEW.id;

    -- ถ้าสมาชิกครบตามที่กำหนด → auto-approve
    IF v_team_size IS NOT NULL AND v_member_count >= v_team_size THEN
      NEW.status      := 'approved';
      NEW.approved_at := now();
      -- approved_by = NULL หมายถึงระบบ auto-approve ไม่ใช่มนุษย์กด
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER teams_auto_approve
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_team();
