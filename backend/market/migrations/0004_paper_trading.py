from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('market', '0003_add_note_entity'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PaperPortfolio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cash_balance', models.DecimalField(decimal_places=2, default=100000, max_digits=15)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='paper_portfolio',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name='PaperPosition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ticker', models.CharField(max_length=20)),
                ('shares', models.DecimalField(decimal_places=6, max_digits=15)),
                ('avg_cost', models.DecimalField(decimal_places=4, max_digits=15)),
                ('portfolio', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='positions',
                    to='market.paperportfolio',
                )),
            ],
            options={
                'ordering': ['ticker'],
                'unique_together': {('portfolio', 'ticker')},
            },
        ),
        migrations.CreateModel(
            name='PaperTrade',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ticker', models.CharField(max_length=20)),
                ('action', models.CharField(choices=[('BUY', 'Buy'), ('SELL', 'Sell')], max_length=4)),
                ('shares', models.DecimalField(decimal_places=6, max_digits=15)),
                ('price', models.DecimalField(decimal_places=4, max_digits=15)),
                ('total', models.DecimalField(decimal_places=2, max_digits=15)),
                ('executed_at', models.DateTimeField(auto_now_add=True)),
                ('portfolio', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='trades',
                    to='market.paperportfolio',
                )),
            ],
            options={
                'ordering': ['-executed_at'],
            },
        ),
    ]
