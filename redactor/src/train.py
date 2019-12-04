import os
from pathlib import Path
from time import sleep

from . import MODEL_DIR


def train_model(model_name):
    model_path = f'{MODEL_DIR}/{model_name}'
    os.mkdir(model_path)
    print(f'Training {model_name}...')
    sleep(10)
    Path(f'{model_path}/trained').touch()
    print(f'Model {model_name} trained.')
