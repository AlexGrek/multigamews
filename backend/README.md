# Getting started

## Backend

Setup backend by running

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Run backend

```
venv\Scripts\activate
python main.py
```



# Protocol

## Commands:

- {"type": "init", "command":  "create", "name": "roomName"}
- {"type": "init", "command":  "request", "data": "avatar_list"}
- {"type": "init", "command":  "enter", "name": "roomName"}
