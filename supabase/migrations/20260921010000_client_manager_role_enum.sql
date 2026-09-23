-- CLIENT_MANAGER: 화양 시행사(시행사 측 현장 관리자) 역할.
-- enum 값 추가는 반드시 다른 문법과 같은 트랜잭션에 있으면 안 되므로 이 파일은 이 한 줄만 담는다.
alter type public.project_member_role add value 'CLIENT_MANAGER';
