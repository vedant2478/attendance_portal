from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from user.models import User, Role


class ApproversListTests(APITestCase):
    def setUp(self):
        # Create roles
        self.role_admin = Role.objects.create(role_name='Admin')
        self.role_hr = Role.objects.create(role_name='HR')
        self.role_manager = Role.objects.create(role_name='Manager')
        self.role_user = Role.objects.create(role_name='User')
        self.role_random = Role.objects.create(role_name='Random')

        # Create users
        self.admin_user = User.objects.create(username='admin', email='admin@example.com', role=self.role_admin, is_active=1)
        self.hr_user = User.objects.create(username='hr', email='hr@example.com', role=self.role_hr, is_active=1)
        self.manager_user = User.objects.create(username='manager', email='manager@example.com', role=self.role_manager, is_active=1)
        self.normal_user = User.objects.create(username='user', email='user@example.com', role=self.role_user, is_active=1)
        self.inactive_admin = User.objects.create(username='inactive_admin', email='inactive_admin@example.com', role=self.role_admin, is_active=0)
        self.random_role_user = User.objects.create(username='random', email='random@example.com', role=self.role_random, is_active=1)

    def _url(self):
        # Router for LeaveRequestViewSet with basename 'leave-request' => action list path name pattern:
        # <basename>-approvers-list
        return reverse('leave-request-approvers-list')

    def test_returns_only_active_admin_hr_manager_users(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        body = resp.json()
        self.assertTrue(body.get('success'))
        self.assertEqual(body.get('count'), 3)
        usernames = [item['username'] for item in body.get('data', [])]
        self.assertCountEqual(usernames, ['admin', 'hr', 'manager'])

    def test_404_when_no_approvers_exist(self):
        # Delete approvers
        User.objects.filter(id__in=[self.admin_user.id, self.hr_user.id, self.manager_user.id]).delete()
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        body = resp.json()
        self.assertFalse(body.get('success'))
        self.assertEqual(body.get('count'), 0)
        self.assertEqual(body.get('data'), [])
        self.assertIn('No approvers found', body.get('message'))

    def test_sorted_by_username_and_distinct(self):
        # Create duplicates that should be distinct by default and check ordering
        # Ordering is by username ascending
        another_admin = User.objects.create(username='a_admin', email='a_admin@example.com', role=self.role_admin, is_active=1)
        z_manager = User.objects.create(username='z_manager', email='z_manager@example.com', role=self.role_manager, is_active=1)

        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json().get('data', [])
        usernames = [u['username'] for u in data]
        # Expected order: a_admin, admin, hr, manager, z_manager
        self.assertEqual(usernames, ['a_admin', 'admin', 'hr', 'manager', 'z_manager'])

    def test_serializer_fields_present(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        item = resp.json()['data'][0]
        # ApproverSerializer fields
        self.assertIn('id', item)
        self.assertIn('username', item)
        self.assertIn('email', item)
        self.assertIn('first_name', item)
        self.assertIn('last_name', item)
        self.assertIn('full_name', item)
        self.assertIn('role', item)
        self.assertIn('role_id', item)
        self.assertIn('role_name', item)

    def test_handles_unexpected_exception(self):
        # Monkey-patch User.objects.filter to raise exception within the view
        from user import models as user_models

        original_filter = user_models.User.objects.filter

        def boom(*args, **kwargs):
            raise Exception('boom')

        try:
            user_models.User.objects.filter = boom  # type: ignore
            resp = self.client.get(self._url())
            self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            body = resp.json()
            self.assertFalse(body.get('success'))
            self.assertIn('An error occurred: boom', body.get('error', ''))
            self.assertEqual(body.get('count'), 0)
            self.assertEqual(body.get('data'), [])
        finally:
            user_models.User.objects.filter = original_filter  # type: ignore
