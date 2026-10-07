"""Exercise the running HTTP API and real MongoDB; remove only this test's record."""
import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

from bson import ObjectId
from pymongo import MongoClient


def request(path, data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = Request('http://localhost:8000' + path, data=body,
                  headers={'Content-Type': 'application/json'})
    with urlopen(req, timeout=10) as response:
        return response.status, json.load(response)


def main():
    client = MongoClient(os.getenv('MONGO_HOST', 'mongo'),
                         int(os.getenv('MONGO_PORT', '27017')),
                         serverSelectionTimeoutMS=3000)
    collection = client[os.getenv('MONGO_DATABASE', 'test_db')]['todos']
    description = 'Smoke test ' + str(uuid4())
    try:
        status, todo = request('/todos', {'description': description})
        assert status == 201
        assert todo['description'] == description
        assert collection.find_one({'_id': ObjectId(todo['id'])})['description'] == description
        assert todo in request('/todos')[1]
        assert todo in request('/todos/')[1]
        try:
            request('/todos', {'description': '   '})
        except HTTPError as error:
            assert error.code == 400
        else:
            raise AssertionError('Blank description was accepted')
        print('PASS: HTTP create/list, MongoDB persistence, slash compatibility and validation')
    finally:
        collection.delete_many({'description': description})
        client.close()


if __name__ == '__main__':
    main()
