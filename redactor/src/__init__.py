from dataclasses import dataclass

import spacy

MODEL_DIR = '/home/app/models'

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


def get_label_vectors(words, trained_model, ground_truth=None):
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
        ] + ([
            0 if ground_truth['H0'][i]
            else 1 if ground_truth['H1'][i]
            else 2
        ] if ground_truth else [])
        for i, label_list in enumerate(labels)
    ]
