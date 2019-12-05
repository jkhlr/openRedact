
import joblib
import spacy
from dataclasses import dataclass

from . import MODEL_DIR


def predict_redaction_labels(words, model_name):
    label_vectors = get_label_vectors(words, model_name)
    classifier = joblib.load(f'{MODEL_DIR}/{model_name}/randomforestmodel.pkl')
    predictions = [int(classifier.predict([vector])) for vector in label_vectors]
    classes = [(int(cls == 0), int(cls == 1)) for cls in predictions]
    h0, h1 = zip(*classes)
    return h0, h1


@dataclass
class Sentence:
    words: list
    start: int
    char_map: dict


def get_char_map(words):
    char_map = {}
    pos = 0
    for i, word in enumerate(words):
        for _ in word:
            char_map[pos] = i
            pos += 1
        # count space
        char_map[pos] = i + 1
        pos += 1
    return char_map


LABEL_POSITIONS = ['H0', 'H1', 'PERSON', 'NORP', 'FAC', 'ORG', 'GPE', 'LOC', 'PRODUCT', 'EVENT', 'WORK_OF_ART', 'LAW',
                   'LANGUAGE', 'DATE', 'TIME', 'PERCENT', 'MONEY', 'QUANTITY', 'ORDINAL', 'CARDINAL']


def get_label_vectors(words, spacy_model_name):
    trained_model = spacy.load(f'{MODEL_DIR}/{spacy_model_name}/spacy')
    spacy_model = spacy.load('en_core_web_sm')
    labels = [None] * len(words)
    sentences = []
    sentence_start = 0
    sentence_words = []
    for i, word in enumerate(words):
        sentence_words.append(word)
        if word.endswith('.'):
            sentences.append(
                Sentence(words=sentence_words, start=sentence_start, char_map=get_char_map(sentence_words)))
            sentence_words = []
            sentence_start = i + 1
    if sentence_words:
        sentences.append(Sentence(words=sentence_words, start=sentence_start, char_map=get_char_map(sentence_words)))

    for sentence in sentences:
        model = trained_model(' '.join(sentence.words))
        for entity in model.ents:
            for i in range(sentence.char_map[entity.start_char], sentence.char_map[entity.end_char]):
                start = sentence.start + i
                if labels[start] is None:
                    labels[start] = []
                labels[start].append(entity.label_)
        model = spacy_model(' '.join(sentence.words))
        for entity in model.ents:
            for i in range(sentence.char_map[entity.start_char], sentence.char_map[entity.end_char]):
                start = sentence.start + i
                if labels[start] is None:
                    labels[start] = []
                if entity.label_ not in labels[start]:
                    labels[start].append(entity.label_)

    return [
        [
            int(label in label_list)
            if label_list
            else 0
            for label in LABEL_POSITIONS
        ]
        for i, label_list in enumerate(labels)
    ]
