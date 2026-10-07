import logging
import os

from pymongo import MongoClient
from pymongo.errors import PyMongoError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser

from .todos import TodoRepository, validate_description

logger = logging.getLogger(__name__)

# Reuse the client's connection pool instead of reconnecting on every request.
mongo_uri = 'mongodb://' + os.environ['MONGO_HOST'] + ':' + os.environ['MONGO_PORT']
client = MongoClient(
    mongo_uri,
    serverSelectionTimeoutMS=3000,
    connectTimeoutMS=3000,
    socketTimeoutMS=3000,
)
db = client['test_db']


class TodoListView(APIView):
    parser_classes = [JSONParser]

    def handle_exception(self, exc):
        if isinstance(exc, PyMongoError):
            logger.exception('MongoDB request failed')
            return Response(
                {'detail': 'Database unavailable. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().handle_exception(exc)

    def get(self, request):
        return Response(TodoRepository(db).list())

    def post(self, request):
        description = validate_description(request.data)
        todo = TodoRepository(db).create(description)
        return Response(todo, status=status.HTTP_201_CREATED)
