-- Trigger to keep updated_at fresh on row updates
DROP TRIGGER IF EXISTS update_roadbooks_updated_at ON public.roadbooks;
CREATE TRIGGER update_roadbooks_updated_at
BEFORE UPDATE ON public.roadbooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for dashboard listing performance
CREATE INDEX IF NOT EXISTS roadbooks_user_id_idx ON public.roadbooks(user_id);
CREATE INDEX IF NOT EXISTS roadbooks_user_id_created_at_idx ON public.roadbooks(user_id, created_at DESC);