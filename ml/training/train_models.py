from ml.training.trainer import ModelTrainingPipeline

if __name__ == "__main__":
    pipeline = ModelTrainingPipeline()
    pipeline.run(register_in_db=True)
