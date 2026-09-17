-- ====================================================================
-- SECURE RPC FUNCTION: get_trainee_assessment_questions
-- Returns only safe question columns for enrolled trainees on published assessments
-- Strictly excludes correct_option
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_trainee_assessment_questions(p_assessment_id UUID)
RETURNS TABLE (
  id UUID,
  assessment_id UUID,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  marks INTEGER,
  question_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_programme_id UUID;
  v_status TEXT;
  v_is_enrolled BOOLEAN;
BEGIN
  -- 1. Ensure caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Verify caller has role = 'trainee'
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS DISTINCT FROM 'trainee' THEN
    RETURN;
  END IF;

  -- 3. Verify assessment exists and is published
  SELECT training_programme_id, status
  INTO v_programme_id, v_status
  FROM public.assessments
  WHERE id = p_assessment_id;

  IF v_programme_id IS NULL OR v_status IS DISTINCT FROM 'published' THEN
    RETURN;
  END IF;

  -- 4. Verify trainee is enrolled in the programme with status 'enrolled' or 'active'
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE training_programme_id = v_programme_id
      AND trainee_id = v_user_id
      AND status IN ('enrolled', 'active')
  ) INTO v_is_enrolled;

  IF NOT v_is_enrolled THEN
    RETURN;
  END IF;

  -- 5. Return ONLY safe columns ordered by question_order ASC (NEVER correct_option)
  RETURN QUERY
  SELECT
    q.id,
    q.assessment_id,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.marks,
    q.question_order
  FROM public.assessment_questions q
  WHERE q.assessment_id = p_assessment_id
  ORDER BY q.question_order ASC;
END;
$$;

-- Permissions and Access Control
GRANT EXECUTE ON FUNCTION public.get_trainee_assessment_questions(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_trainee_assessment_questions(UUID) FROM anon;
