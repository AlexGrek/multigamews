class UserCommandError(Exception):
    def __init__(self, message, error_type):
        super().__init__(message)
        self.error_type = error_type
