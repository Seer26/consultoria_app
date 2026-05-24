sealed class Result<T> {
  const Result();

  R when<R>({
    required R Function(T data) success,
    required R Function(String message) error,
  }) {
    switch (this) {
      case Success<T>(:final data):
        return success(data);
      case Error<T>(:final message):
        return error(message);
    }
  }
}

class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);
}

class Error<T> extends Result<T> {
  final String message;
  const Error(this.message);
}
