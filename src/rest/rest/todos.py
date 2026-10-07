from rest_framework.exceptions import ValidationError

MAX_DESCRIPTION_LENGTH = 500


def validate_description(data):
    if not isinstance(data, dict) or set(data) != {'description'}:
        raise ValidationError({'description': 'Send an object containing only description.'})
    description = data['description']
    if not isinstance(description, str) or not description.strip():
        raise ValidationError({'description': 'Enter a non-empty description.'})
    description = description.strip()
    if len(description) > MAX_DESCRIPTION_LENGTH:
        raise ValidationError({'description': 'Use 500 characters or fewer.'})
    return description


def as_todo(document):
    return {'id': str(document['_id']), 'description': document['description']}


class TodoRepository:
    def __init__(self, database):
        self.collection = database['todos']

    def list(self):
        return [as_todo(doc) for doc in self.collection.find().sort('_id', 1)]

    def create(self, description):
        document = {'description': description}
        result = self.collection.insert_one(document)
        return {'id': str(result.inserted_id), 'description': description}
