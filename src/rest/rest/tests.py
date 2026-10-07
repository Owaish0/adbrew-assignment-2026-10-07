import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from bson import ObjectId
from django.test import SimpleTestCase
from pymongo.errors import ServerSelectionTimeoutError
from rest_framework.test import APIClient


class TodoAPITests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()
        self.database = MagicMock()
        self.collection = self.database.__getitem__.return_value
        self.patcher = patch('rest.views.db', self.database)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def test_list_returns_json_ids_and_descriptions(self):
        identifier = ObjectId()
        self.collection.find.return_value.sort.return_value = [
            {'_id': identifier, 'description': 'Learn Docker'},
        ]
        response = self.client.get('/todos')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [{'id': str(identifier), 'description': 'Learn Docker'}])
        self.collection.find.return_value.sort.assert_called_once_with('_id', 1)

    def test_empty_list(self):
        self.collection.find.return_value.sort.return_value = []
        self.assertEqual(self.client.get('/todos').json(), [])

    def test_create_trims_description_and_returns_inserted_id(self):
        identifier = ObjectId()
        self.collection.insert_one.return_value = SimpleNamespace(inserted_id=identifier)
        response = self.client.post('/todos', {'description': '  Read the docs  '}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {'id': str(identifier), 'description': 'Read the docs'})
        self.collection.insert_one.assert_called_once_with({'description': 'Read the docs'})

    def test_invalid_input_never_reaches_database(self):
        invalid = [{}, [], None, 'text', {'description': None}, {'description': 42},
                   {'description': True}, {'description': []}, {'description': {}},
                   {'description': ''}, {'description': ' \n\t'}, {'description': 'x' * 501},
                   {'description': 'valid', 'unexpected': True}]
        for body in invalid:
            with self.subTest(body=body):
                response = self.client.post('/todos', json.dumps(body), content_type='application/json')
                self.assertEqual(response.status_code, 400)
        self.collection.insert_one.assert_not_called()

    def test_length_boundary_and_unicode(self):
        self.collection.insert_one.return_value = SimpleNamespace(inserted_id=ObjectId())
        response = self.client.post('/todos', {'description': '😀' * 500}, format='json')
        self.assertEqual(response.status_code, 201)

    def test_invalid_json_and_content_type(self):
        self.assertEqual(self.client.post('/todos', '{', content_type='application/json').status_code, 400)
        self.assertEqual(self.client.post('/todos', 'hello', content_type='text/plain').status_code, 415)

    def test_both_routes_accept_posts_without_redirects(self):
        self.collection.insert_one.return_value = SimpleNamespace(inserted_id=ObjectId())
        for url in ['/todos', '/todos/']:
            self.assertEqual(self.client.post(url, {'description': 'Task'}, format='json').status_code, 201)

    def test_unsupported_methods(self):
        for method in ['put', 'patch', 'delete']:
            self.assertEqual(getattr(self.client, method)('/todos').status_code, 405)

    def test_database_failure_does_not_expose_internal_details(self):
        self.collection.find.side_effect = ServerSelectionTimeoutError('private connection details')
        self.collection.insert_one.side_effect = ServerSelectionTimeoutError('private connection details')
        with self.assertLogs('rest.views', level='ERROR'):
            responses = [self.client.get('/todos'), self.client.post('/todos', {'description': 'Task'}, format='json')]
        for response in responses:
            self.assertEqual(response.status_code, 503)
            self.assertNotIn('private', response.content.decode())
